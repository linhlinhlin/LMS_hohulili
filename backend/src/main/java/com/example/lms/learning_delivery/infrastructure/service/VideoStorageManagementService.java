package com.example.lms.learning_delivery.infrastructure.service;

import com.example.lms.learning_delivery.infrastructure.persistence.entity.VideoAssetJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.VideoRenditionJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.repository.VideoAssetJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.repository.VideoRenditionJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class VideoStorageManagementService {

    private static final int DEFAULT_REPORT_LIMIT = 20;
    private static final int MAX_REPORT_LIMIT = 100;
    private static final int DEFAULT_CLEANUP_LIMIT = 20;
    private static final int MAX_CLEANUP_LIMIT = 100;
    private static final int DEFAULT_RETENTION_DAYS = 14;

    private final VideoAssetJpaRepository videoAssetRepository;
    private final VideoRenditionJpaRepository videoRenditionRepository;
    private final VideoBinaryStorageService videoBinaryStorageService;
    private final JdbcTemplate jdbcTemplate;

    @Transactional(readOnly = true)
    public VideoStorageReport getStorageReport(Integer requestedLimit) {
        int limit = normalizeLimit(requestedLimit, DEFAULT_REPORT_LIMIT, MAX_REPORT_LIMIT);
        List<VideoAssetJpaEntity> assets = videoAssetRepository.findAll();
        List<UUID> assetIds = assets.stream().map(VideoAssetJpaEntity::getId).toList();
        List<VideoRenditionJpaEntity> renditions = assetIds.isEmpty()
                ? List.of()
                : videoRenditionRepository.findByVideoAssetIdIn(assetIds);

        Map<UUID, Long> renditionBytesByAsset = renditions.stream()
                .filter(rendition -> "READY".equalsIgnoreCase(rendition.getStatus()))
                .collect(Collectors.groupingBy(
                        VideoRenditionJpaEntity::getVideoAssetId,
                        Collectors.summingLong(rendition -> nullToZero(rendition.getFileSizeBytes()))
                ));

        Map<String, Long> assetsByStatus = assets.stream()
                .collect(Collectors.groupingBy(
                        asset -> blankToDefault(asset.getStatus(), "UNKNOWN"),
                        LinkedHashMap::new,
                        Collectors.counting()
                ));

        long sourceBytes = assets.stream().mapToLong(this::retainedSourceBytes).sum();
        long packageBytes = assets.stream().mapToLong(this::retainedPackageBytes).sum();
        long renditionBytes = assets.stream()
                .filter(this::isActive)
                .mapToLong(asset -> renditionBytesByAsset.getOrDefault(asset.getId(), 0L))
                .sum();

        Map<UUID, ReferenceCounts> referencesByAsset = assets.stream()
                .collect(Collectors.toMap(VideoAssetJpaEntity::getId, asset -> countReferences(asset.getId())));

        long referencedAssets = referencesByAsset.values().stream().filter(ReferenceCounts::referenced).count();
        long duplicateAssets = assets.stream().filter(asset -> asset.getDuplicateOfAssetId() != null).count();
        long duplicateSourceBytes = assets.stream()
                .filter(asset -> asset.getDuplicateOfAssetId() != null)
                .mapToLong(this::retainedSourceBytes)
                .sum();
        long unknownPackageAssets = assets.stream()
                .filter(this::isActive)
                .filter(asset -> "READY".equalsIgnoreCase(asset.getStatus()))
                .filter(asset -> asset.getPackageSizeBytes() == null)
                .count();
        long reclaimableUnreferencedBytes = assets.stream()
                .filter(this::isActive)
                .filter(asset -> !referencesByAsset.get(asset.getId()).referenced())
                .filter(asset -> !hasActiveDuplicateChildren(asset.getId()))
                .mapToLong(asset -> estimatedBytes(asset, renditionBytesByAsset))
                .sum();

        List<VideoAssetStorageView> topAssets = assets.stream()
                .filter(this::isActive)
                .map(asset -> toStorageView(asset, renditionBytesByAsset, referencesByAsset.get(asset.getId())))
                .sorted(Comparator.comparingLong(VideoAssetStorageView::estimatedBytes).reversed())
                .limit(limit)
                .toList();

        return new VideoStorageReport(
                assets.size(),
                referencedAssets,
                duplicateAssets,
                unknownPackageAssets,
                sourceBytes,
                renditionBytes,
                packageBytes,
                sourceBytes + renditionBytes + packageBytes,
                duplicateSourceBytes,
                reclaimableUnreferencedBytes,
                assetsByStatus,
                topAssets
        );
    }

    @Transactional
    public VideoCleanupResult cleanupOrphanedAssets(Boolean dryRun, Integer retentionDays, Integer requestedLimit) {
        boolean previewOnly = dryRun == null || dryRun;
        int safeRetentionDays = retentionDays == null ? DEFAULT_RETENTION_DAYS : Math.max(1, retentionDays);
        int limit = normalizeLimit(requestedLimit, DEFAULT_CLEANUP_LIMIT, MAX_CLEANUP_LIMIT);
        Instant cutoff = Instant.now().minusSeconds(safeRetentionDays * 24L * 60L * 60L);

        List<VideoAssetJpaEntity> candidates = videoAssetRepository.findAll().stream()
                .filter(this::isActive)
                .filter(asset -> assetUpdatedAt(asset).isBefore(cutoff))
                .filter(asset -> !countReferences(asset.getId()).referenced())
                .filter(asset -> !hasActiveDuplicateChildren(asset.getId()))
                .sorted(Comparator.comparing(this::assetUpdatedAt))
                .limit(limit)
                .toList();

        long reclaimedBytes = 0;
        int deletedObjects = 0;
        for (VideoAssetJpaEntity asset : candidates) {
            long estimatedBytes = estimatedBytes(asset, Map.of(asset.getId(), readyRenditionBytes(asset.getId())));
            if (!previewOnly) {
                deletedObjects += deleteAssetStorage(asset);
                markStorageDeleted(asset);
                reclaimedBytes += estimatedBytes;
            }
        }

        return new VideoCleanupResult(
                previewOnly,
                safeRetentionDays,
                limit,
                candidates.size(),
                reclaimedBytes,
                deletedObjects,
                candidates.stream()
                        .map(asset -> new CleanupCandidate(
                                asset.getId(),
                                asset.getOriginalFileName(),
                                asset.getStatus(),
                                asset.getDuplicateOfAssetId(),
                                retainedSourceBytes(asset),
                                nullToZero(asset.getPackageSizeBytes()),
                                assetUpdatedAt(asset)
                        ))
                        .toList()
        );
    }

    private VideoAssetStorageView toStorageView(
            VideoAssetJpaEntity asset,
            Map<UUID, Long> renditionBytesByAsset,
            ReferenceCounts referenceCounts
    ) {
        long sourceBytes = retainedSourceBytes(asset);
        long renditionBytes = renditionBytesByAsset.getOrDefault(asset.getId(), 0L);
        long packageBytes = retainedPackageBytes(asset);
        return new VideoAssetStorageView(
                asset.getId(),
                asset.getOriginalFileName(),
                asset.getStatus(),
                asset.getAdaptivePackagingStatus(),
                asset.getStorageState(),
                asset.getDuplicateOfAssetId(),
                referenceCounts != null && referenceCounts.referenced(),
                sourceBytes,
                renditionBytes,
                packageBytes,
                sourceBytes + renditionBytes + packageBytes,
                asset.getDurationSeconds(),
                asset.getWidth(),
                asset.getHeight(),
                asset.getCreatedAt(),
                asset.getUpdatedAt()
        );
    }

    private int deleteAssetStorage(VideoAssetJpaEntity asset) {
        int deletedObjects = 0;
        Set<String> deletedKeys = new java.util.HashSet<>();

        String sourceKey = asset.getSourceStorageKey();
        if (Boolean.TRUE.equals(asset.getSourceRetained()) && hasText(sourceKey)) {
            videoBinaryStorageService.delete(sourceKey);
            deletedKeys.add(sourceKey);
            deletedObjects++;
        }

        for (VideoRenditionJpaEntity rendition : videoRenditionRepository.findByVideoAssetId(asset.getId())) {
            String key = rendition.getStorageKey();
            if (hasText(key) && isOwnedGeneratedRendition(asset.getId(), key) && deletedKeys.add(key)) {
                videoBinaryStorageService.delete(key);
                deletedObjects++;
            }
        }

        deletedObjects += videoBinaryStorageService.deletePrefix("video-packages/" + asset.getId() + "/");
        videoRenditionRepository.deleteByVideoAssetId(asset.getId());
        log.info("[VideoStorage] Deleted orphaned video asset storage: assetId={}, objects={}", asset.getId(), deletedObjects);
        return deletedObjects;
    }

    private void markStorageDeleted(VideoAssetJpaEntity asset) {
        asset.setStorageState("DELETED");
        asset.setStorageDeletedAt(Instant.now());
        asset.setSourceRetained(false);
        asset.setPackageSizeBytes(0L);
        asset.setStatus("DELETED");
        asset.setAdaptivePackagingStatus("DELETED");
        asset.setHlsManifestStorageKey(null);
        asset.setDashManifestStorageKey(null);
        asset.setPlaybackUrl(null);
        videoAssetRepository.save(asset);
    }

    private ReferenceCounts countReferences(UUID assetId) {
        String needle = "%" + assetId + "%";
        long courseIntro = queryCount("SELECT COUNT(*) FROM courses WHERE intro_video_asset_id = ?::uuid", assetId.toString());
        long lessonBlocks = queryCount("SELECT COUNT(*) FROM lessons WHERE content_blocks::text LIKE ?", needle);
        long publicationSnapshots = queryCount("SELECT COUNT(*) FROM course_publications WHERE snapshot::text LIKE ?", needle);
        return new ReferenceCounts(courseIntro, lessonBlocks, publicationSnapshots);
    }

    private long queryCount(String sql, Object arg) {
        Long value = jdbcTemplate.queryForObject(sql, Long.class, arg);
        return value == null ? 0L : value;
    }

    private boolean hasActiveDuplicateChildren(UUID assetId) {
        return videoAssetRepository.findByDuplicateOfAssetId(assetId).stream().anyMatch(this::isActive);
    }

    private long estimatedBytes(VideoAssetJpaEntity asset, Map<UUID, Long> renditionBytesByAsset) {
        return retainedSourceBytes(asset)
                + retainedPackageBytes(asset)
                + renditionBytesByAsset.getOrDefault(asset.getId(), 0L);
    }

    private long readyRenditionBytes(UUID assetId) {
        return videoRenditionRepository.findByVideoAssetId(assetId).stream()
                .filter(rendition -> "READY".equalsIgnoreCase(rendition.getStatus()))
                .mapToLong(rendition -> nullToZero(rendition.getFileSizeBytes()))
                .sum();
    }

    private long retainedSourceBytes(VideoAssetJpaEntity asset) {
        if (!isActive(asset) || !Boolean.TRUE.equals(asset.getSourceRetained())) {
            return 0L;
        }
        return nullToZero(asset.getSourceFileSize());
    }

    private long retainedPackageBytes(VideoAssetJpaEntity asset) {
        return isActive(asset) ? nullToZero(asset.getPackageSizeBytes()) : 0L;
    }

    private boolean isActive(VideoAssetJpaEntity asset) {
        return asset != null && !"DELETED".equalsIgnoreCase(asset.getStorageState());
    }

    private Instant assetUpdatedAt(VideoAssetJpaEntity asset) {
        if (asset.getUpdatedAt() != null) {
            return asset.getUpdatedAt();
        }
        if (asset.getCreatedAt() != null) {
            return asset.getCreatedAt();
        }
        return Instant.EPOCH;
    }

    private boolean isOwnedGeneratedRendition(UUID assetId, String storageKey) {
        return storageKey.startsWith("video-renditions/" + assetId + "/");
    }

    private int normalizeLimit(Integer requestedLimit, int defaultLimit, int maxLimit) {
        if (requestedLimit == null) {
            return defaultLimit;
        }
        return Math.max(1, Math.min(requestedLimit, maxLimit));
    }

    private long nullToZero(Long value) {
        return value == null ? 0L : Math.max(0L, value);
    }

    private String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    public record VideoStorageReport(
            long totalAssets,
            long referencedAssets,
            long duplicateAssets,
            long unknownPackageAssets,
            long sourceBytes,
            long renditionBytes,
            long packageBytes,
            long estimatedTotalBytes,
            long duplicateSourceBytes,
            long reclaimableUnreferencedBytes,
            Map<String, Long> assetsByStatus,
            List<VideoAssetStorageView> topAssets
    ) {}

    public record VideoAssetStorageView(
            UUID assetId,
            String originalFileName,
            String status,
            String adaptivePackagingStatus,
            String storageState,
            UUID duplicateOfAssetId,
            boolean referenced,
            long sourceBytes,
            long renditionBytes,
            long packageBytes,
            long estimatedBytes,
            Integer durationSeconds,
            Integer width,
            Integer height,
            Instant createdAt,
            Instant updatedAt
    ) {}

    public record VideoCleanupResult(
            boolean dryRun,
            int retentionDays,
            int limit,
            int candidateCount,
            long reclaimedBytes,
            int deletedObjects,
            List<CleanupCandidate> candidates
    ) {}

    public record CleanupCandidate(
            UUID assetId,
            String originalFileName,
            String status,
            UUID duplicateOfAssetId,
            long sourceBytes,
            long packageBytes,
            Instant updatedAt
    ) {}

    public record ReferenceCounts(
            long courseIntroReferences,
            long lessonBlockReferences,
            long publicationSnapshotReferences
    ) {
        boolean referenced() {
            return courseIntroReferences > 0 || lessonBlockReferences > 0 || publicationSnapshotReferences > 0;
        }
    }
}

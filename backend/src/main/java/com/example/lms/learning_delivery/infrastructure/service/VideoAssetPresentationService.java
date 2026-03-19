package com.example.lms.learning_delivery.infrastructure.service;

import com.example.lms.learning_delivery.infrastructure.persistence.entity.VideoAssetJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.VideoIngestJobJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.VideoRenditionJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.repository.VideoAssetJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.repository.VideoIngestJobJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.repository.VideoRenditionJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VideoAssetPresentationService {

    private static final List<String> PROFILE_ORDER = List.of("SAVER", "STANDARD", "HIGH", "ORIGINAL");
    private static final List<String> OFFLINE_PROFILE_FALLBACK_ORDER = List.of("STANDARD", "SAVER", "HIGH");

    private final VideoAssetJpaRepository videoAssetRepository;
    private final VideoIngestJobJpaRepository videoIngestJobRepository;
    private final VideoRenditionJpaRepository videoRenditionRepository;

    public Optional<VideoAssetView> getView(UUID videoAssetId) {
        if (videoAssetId == null) {
            return Optional.empty();
        }
        return getViews(List.of(videoAssetId)).values().stream().findFirst();
    }

    public Map<UUID, VideoAssetView> getViews(Collection<UUID> videoAssetIds) {
        if (videoAssetIds == null || videoAssetIds.isEmpty()) {
            return Map.of();
        }

        List<VideoAssetJpaEntity> assets = videoAssetRepository.findByIdIn(videoAssetIds);
        if (assets.isEmpty()) {
            return Map.of();
        }

        Map<UUID, List<VideoRenditionJpaEntity>> renditionMap = videoRenditionRepository.findByVideoAssetIdIn(
                assets.stream().map(VideoAssetJpaEntity::getId).toList()
        ).stream().collect(Collectors.groupingBy(VideoRenditionJpaEntity::getVideoAssetId));
        Map<UUID, VideoIngestJobJpaEntity> ingestJobMap = videoIngestJobRepository.findByVideoAssetIdIn(
                assets.stream().map(VideoAssetJpaEntity::getId).toList()
        ).stream().collect(Collectors.toMap(
                VideoIngestJobJpaEntity::getVideoAssetId,
                job -> job,
                (left, right) -> {
                    if (left.getUpdatedAt() == null) {
                        return right;
                    }
                    if (right.getUpdatedAt() == null) {
                        return left;
                    }
                    return left.getUpdatedAt().isAfter(right.getUpdatedAt()) ? left : right;
                }
        ));

        Map<UUID, VideoAssetView> result = new LinkedHashMap<>();
        for (VideoAssetJpaEntity asset : assets) {
            result.put(asset.getId(), buildView(
                    asset,
                    ingestJobMap.get(asset.getId()),
                    renditionMap.getOrDefault(asset.getId(), List.of())
            ));
        }
        return result;
    }

    public Optional<OfflineTargetView> resolveOfflineTarget(UUID videoAssetId, String requestedProfile) {
        Optional<VideoAssetView> view = getView(videoAssetId);
        if (view.isEmpty()) {
            return Optional.empty();
        }

        List<OfflineProfileView> availableProfiles = view.get().availableOfflineProfiles();
        if (availableProfiles.isEmpty()) {
            return Optional.empty();
        }

        String normalizedProfile = normalizeRequestedProfile(requestedProfile);

        OfflineProfileView exact = availableProfiles.stream()
                .filter(profile -> normalizedProfile.equals(profile.id()))
                .findFirst()
                .orElse(null);
        if (exact != null) {
            return Optional.of(new OfflineTargetView(exact.id(), exact.label(), exact.actualResolution(), exact.sizeBytes(), exact.storageKey()));
        }

        for (String candidate : OFFLINE_PROFILE_FALLBACK_ORDER) {
            OfflineProfileView fallback = availableProfiles.stream()
                    .filter(profile -> candidate.equals(profile.id()))
                    .findFirst()
                    .orElse(null);
            if (fallback != null) {
                return Optional.of(new OfflineTargetView(fallback.id(), fallback.label(), fallback.actualResolution(), fallback.sizeBytes(), fallback.storageKey()));
            }
        }

        OfflineProfileView original = availableProfiles.stream()
                .filter(profile -> "ORIGINAL".equals(profile.id()))
                .findFirst()
                .orElse(null);
        return original == null
                ? Optional.empty()
                : Optional.of(new OfflineTargetView(original.id(), original.label(), original.actualResolution(), original.sizeBytes(), original.storageKey()));
    }

    private VideoAssetView buildView(
            VideoAssetJpaEntity asset,
            VideoIngestJobJpaEntity ingestJob,
            List<VideoRenditionJpaEntity> renditions
    ) {
        List<OfflineProfileView> readyRenditions = renditions.stream()
                .filter(rendition -> "READY".equalsIgnoreCase(rendition.getStatus()))
                .sorted(Comparator.comparingInt(rendition -> profileOrder(rendition.getProfile())))
                .map(this::toOfflineProfileView)
                .toList();

        List<OfflineProfileView> groupedProfiles = readyRenditions.stream()
                .filter(profile -> !"ORIGINAL".equals(profile.id()))
                .toList();

        return new VideoAssetView(
                asset.getId(),
                resolveDisplayedStatus(asset.getStatus(), ingestJob),
                resolveDisplayedStatus(asset.getAdaptivePackagingStatus(), ingestJob),
                resolveSourceKind(asset),
                asset.getOriginalFileName(),
                asset.getSourceFileSize(),
                asset.getDurationSeconds(),
                asset.getWidth(),
                asset.getHeight(),
                asset.getStreamVideoUid(),
                null,
                asset.getErrorMessage(),
                asset.getHlsManifestStorageKey(),
                asset.getDashManifestStorageKey(),
                groupedProfiles.isEmpty() ? readyRenditions : groupedProfiles
        );
    }

    private String resolveDisplayedStatus(String assetStatus, VideoIngestJobJpaEntity ingestJob) {
        if (ingestJob == null || ingestJob.getStatus() == null) {
            return assetStatus;
        }
        if ("PROCESSING".equalsIgnoreCase(ingestJob.getStatus())
                && !"READY".equalsIgnoreCase(assetStatus)
                && !"FAILED".equalsIgnoreCase(assetStatus)) {
            return "PROCESSING";
        }
        return assetStatus;
    }

    private OfflineProfileView toOfflineProfileView(VideoRenditionJpaEntity rendition) {
        String normalizedProfile = rendition.getProfile() == null
                ? "ORIGINAL"
                : rendition.getProfile().toUpperCase(Locale.ROOT);
        return new OfflineProfileView(
                normalizedProfile,
                profileLabel(normalizedProfile),
                rendition.getActualResolution(),
                rendition.getFileSizeBytes(),
                rendition.getStorageKey()
        );
    }

    private String resolveSourceKind(VideoAssetJpaEntity asset) {
        if (asset.getHlsManifestStorageKey() != null || asset.getDashManifestStorageKey() != null) {
            return "ADAPTIVE_R2";
        }
        if ("EXTERNAL".equalsIgnoreCase(asset.getSourceKind()) || "EXTERNAL_URL".equalsIgnoreCase(asset.getSourceKind())) {
            return "EXTERNAL";
        }
        return "LEGACY_DIRECT";
    }

    private int profileOrder(String profile) {
        String normalized = profile == null ? "ORIGINAL" : profile.toUpperCase(Locale.ROOT);
        int index = PROFILE_ORDER.indexOf(normalized);
        return index < 0 ? PROFILE_ORDER.size() : index;
    }

    private String normalizeRequestedProfile(String requestedProfile) {
        if (requestedProfile == null || requestedProfile.isBlank()) {
            return "STANDARD";
        }
        String normalized = requestedProfile.trim().toUpperCase(Locale.ROOT);
        return PROFILE_ORDER.contains(normalized) ? normalized : "STANDARD";
    }

    private String profileLabel(String profile) {
        return switch (profile) {
            case "SAVER" -> "Tiet kiem du lieu";
            case "STANDARD" -> "Chuan";
            case "HIGH" -> "Chat luong cao";
            default -> "Ban goc";
        };
    }

    public record VideoAssetView(
            UUID id,
            String status,
            String adaptivePackagingStatus,
            String videoSourceKind,
            String originalFileName,
            Long sourceFileSize,
            Integer durationSeconds,
            Integer width,
            Integer height,
            String streamVideoUid,
            String playbackUrl,
            String errorMessage,
            String hlsManifestStorageKey,
            String dashManifestStorageKey,
            List<OfflineProfileView> availableOfflineProfiles
    ) {}

    public record OfflineProfileView(
            String id,
            String label,
            String actualResolution,
            Long sizeBytes,
            String storageKey
    ) {}

    public record OfflineTargetView(
            String profile,
            String profileLabel,
            String actualResolution,
            Long sizeBytes,
            String storageKey
    ) {}
}

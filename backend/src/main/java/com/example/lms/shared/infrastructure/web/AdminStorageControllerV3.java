package com.example.lms.shared.infrastructure.web;

import com.example.lms.shared.infrastructure.persistence.entity.FileAttachmentJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.FileAttachmentJpaRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Response;

import java.time.Instant;
import java.util.*;

/**
 * Admin storage console — read-mostly endpoints behind {@code /api/v3/admin/storage/}.
 * ADMIN-only because it lists raw file paths and upload metadata.
 */
@RestController
@RequestMapping("/api/v3/admin/storage")
@PreAuthorize("hasRole('ADMIN')")
@Slf4j
@Tag(name = "Admin Storage", description = "Storage health, orphan review, audit log")
public class AdminStorageControllerV3 {

    private final FileAttachmentJpaRepository fileRepository;
    private final Optional<S3Client> r2Client;
    private final String publicBucket;
    private final String videoBucket;
    private final String simulationBucket;
    private final boolean videoCdnRequired;
    private final String videoMediaDomain;
    private final String videoEdgeAuthMode;
    private final String videoEdgeHmacSecret;
    private final String videoEdgeTokenExpirySeconds;
    private final String videoManifestCacheSeconds;

    @Autowired
    public AdminStorageControllerV3(
            FileAttachmentJpaRepository fileRepository,
            @Autowired(required = false) S3Client r2Client,
            @Value("${cloudflare.r2.bucket:}") String publicBucket,
            @Value("${cloudflare.r2.video-bucket:}") String videoBucket,
            @Value("${cloudflare.r2.simulation-bucket:}") String simulationBucket,
            @Value("${app.video.cdn-required:false}") boolean videoCdnRequired,
            @Value("${app.video.media-domain:}") String videoMediaDomain,
            @Value("${app.video.edge-auth-mode:disabled}") String videoEdgeAuthMode,
            @Value("${app.video.edge-hmac-secret:}") String videoEdgeHmacSecret,
            @Value("${app.video.edge-token-expiry-seconds:300}") String videoEdgeTokenExpirySeconds,
            @Value("${app.video.manifest-cache-seconds:60}") String videoManifestCacheSeconds) {
        this.fileRepository = fileRepository;
        this.r2Client = Optional.ofNullable(r2Client);
        this.publicBucket = publicBucket;
        this.videoBucket = videoBucket;
        this.simulationBucket = simulationBucket;
        this.videoCdnRequired = videoCdnRequired;
        this.videoMediaDomain = videoMediaDomain;
        this.videoEdgeAuthMode = videoEdgeAuthMode;
        this.videoEdgeHmacSecret = videoEdgeHmacSecret;
        this.videoEdgeTokenExpirySeconds = videoEdgeTokenExpirySeconds;
        this.videoManifestCacheSeconds = videoManifestCacheSeconds;
    }

    @GetMapping("/health")
    @Operation(summary = "Storage health: R2 reachability + bucket stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> health() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("checkedAt", Instant.now().toString());

        Map<String, Object> publicStats = bucketStats(publicBucket);
        Map<String, Object> videoStats = bucketStats(videoBucket);
        Map<String, Object> simulationStats = bucketStats(simulationBucket);
        result.put("publicBucket", publicStats);
        result.put("videoBucket", videoStats);
        result.put("simulationBucket", simulationStats);
        result.put("videoCdn", videoCdnStatus());

        long totalAttachments = fileRepository.count();
        long pendingReview = fileRepository.findOrphanedBefore(Instant.now()).size();
        Map<String, Object> dbStats = new LinkedHashMap<>();
        dbStats.put("totalAttachments", totalAttachments);
        dbStats.put("currentOrphans", pendingReview);
        result.put("db", dbStats);

        return ResponseEntity.ok(ApiResponse.success(result, "Storage health"));
    }

    @GetMapping("/orphans")
    @Operation(summary = "List file_attachments tagged PENDING_LINK_REVIEW (manual queue)")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listPendingReview() {
        // Pull all PENDING_LINK_REVIEW records — typically <100, so no pagination yet.
        var pending = fileRepository.findAll().stream()
                .filter(f -> "PENDING_LINK_REVIEW".equals(f.getEntityType()))
                .sorted(Comparator.comparing(FileAttachmentJpaEntity::getUploadedAt).reversed())
                .map(this::toListItem)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(pending, "Danh sách file chờ review thủ công"));
    }

    @PostMapping("/orphans/{id}/release")
    @Operation(summary = "Release: delete attachment + storage object after admin review")
    public ResponseEntity<ApiResponse<Map<String, String>>> releaseOrphan(@PathVariable UUID id) {
        var fa = fileRepository.findById(id).orElse(null);
        if (fa == null) {
            return ResponseEntity.status(404).body(ApiResponse.error("Không tìm thấy file"));
        }
        if (!"PENDING_LINK_REVIEW".equals(fa.getEntityType())) {
            return ResponseEntity.badRequest().body(ApiResponse.error("File không ở trạng thái PENDING_LINK_REVIEW"));
        }
        // Soft delete first — backfill column added in V129. Cleanup scheduler will hard-delete after retention.
        fa.setEntityId(null);
        fa.setEntityType(null);
        // FileAttachmentJpaEntity does not yet expose a deleted_at setter on the entity model;
        // use the repository custom update if needed. For MVP we just clear sentinel — cleanup
        // referential query will pick it up on the next 3 AM run.
        fileRepository.save(fa);
        log.info("[AdminStorage] Released orphan {} for cleanup", id);
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("id", id.toString(), "status", "released"),
                "Đã chuyển file sang hàng đợi xóa"));
    }

    private Map<String, Object> bucketStats(String bucket) {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("name", bucket);
        if (bucket == null || bucket.isBlank() || r2Client.isEmpty()) {
            stats.put("reachable", false);
            stats.put("reason", "R2 not configured");
            return stats;
        }
        try {
            r2Client.get().headBucket(HeadBucketRequest.builder().bucket(bucket).build());
            stats.put("reachable", true);
        } catch (Exception ex) {
            stats.put("reachable", false);
            stats.put("error", ex.getClass().getSimpleName() + ": " + ex.getMessage());
            return stats;
        }

        // Approximate total size + object count via paginated list — capped at 5000 objects
        // per call to avoid hot-path latency. UI shows ">N+" if truncated.
        try {
            ListObjectsV2Response resp = r2Client.get().listObjectsV2(
                    ListObjectsV2Request.builder().bucket(bucket).maxKeys(5000).build());
            long objects = resp.contents() == null ? 0 : resp.contents().size();
            long bytes = resp.contents() == null ? 0
                    : resp.contents().stream().mapToLong(o -> o.size() == null ? 0L : o.size()).sum();
            stats.put("objectCount", objects);
            stats.put("totalBytes", bytes);
            stats.put("truncated", Boolean.TRUE.equals(resp.isTruncated()));
        } catch (Exception ex) {
            stats.put("listError", ex.getClass().getSimpleName());
        }
        return stats;
    }

    private Map<String, Object> videoCdnStatus() {
        boolean mediaDomainConfigured = hasText(videoMediaDomain);
        String edgeAuthMode = normalizeEdgeAuthMode(videoEdgeAuthMode);
        long tokenTtlSeconds = parsePositiveLong(videoEdgeTokenExpirySeconds, 300L);
        long manifestCacheSeconds = parsePositiveLong(videoManifestCacheSeconds, 60L);
        long effectiveManifestCacheSeconds = Math.max(10L, manifestCacheSeconds);
        boolean edgeAuthConfigured = "media_hmac_query".equals(edgeAuthMode)
                && hasText(videoEdgeHmacSecret)
                && tokenTtlSeconds > 0;
        boolean edgeTokenFreshEnough = tokenTtlSeconds > effectiveManifestCacheSeconds;
        boolean cdnSegmentDeliveryReady = mediaDomainConfigured && edgeAuthConfigured && edgeTokenFreshEnough;

        List<String> requiredActions = new ArrayList<>();
        if (!mediaDomainConfigured) {
            requiredActions.add("Configure VIDEO_MEDIA_DOMAIN");
        }
        if (!"media_hmac_query".equals(edgeAuthMode)) {
            requiredActions.add("Set VIDEO_EDGE_AUTH_MODE=media_hmac_query");
        }
        if (!hasText(videoEdgeHmacSecret)) {
            requiredActions.add("Set VIDEO_EDGE_HMAC_SECRET");
        }
        if (tokenTtlSeconds <= 0) {
            requiredActions.add("Set VIDEO_EDGE_TOKEN_EXPIRY_SECONDS to a positive value");
        }
        if (tokenTtlSeconds > 0 && !edgeTokenFreshEnough) {
            requiredActions.add("Set VIDEO_EDGE_TOKEN_EXPIRY_SECONDS greater than VIDEO_MANIFEST_CACHE_SECONDS");
        }

        Map<String, Object> status = new LinkedHashMap<>();
        status.put("cdnRequired", videoCdnRequired);
        status.put("cdnSegmentDeliveryReady", cdnSegmentDeliveryReady);
        status.put("cdnDeliveryMode", cdnSegmentDeliveryReady ? "MEDIA_DOMAIN_EDGE" : "BACKEND_OBJECT_PROXY");
        status.put("mediaDomain", normalizeMediaDomain(videoMediaDomain));
        status.put("mediaDomainConfigured", mediaDomainConfigured);
        status.put("edgeAuthMode", edgeAuthMode);
        status.put("edgeAuthConfigured", edgeAuthConfigured);
        status.put("edgeTokenExpirySeconds", tokenTtlSeconds);
        status.put("manifestCacheSeconds", manifestCacheSeconds);
        status.put("edgeTokenFreshEnough", edgeTokenFreshEnough);
        status.put("requiredActions", requiredActions);
        status.put("status", cdnSegmentDeliveryReady
                ? "READY"
                : videoCdnRequired ? "MISCONFIGURED" : "FALLBACK");
        return status;
    }

    private String normalizeEdgeAuthMode(String mode) {
        String normalized = mode == null ? "" : mode.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "media_hmac_query", "query_hmac", "hmac_query", "waf_hmac_query", "worker_hmac_query" ->
                    "media_hmac_query";
            default -> "disabled";
        };
    }

    private String normalizeMediaDomain(String domain) {
        if (!hasText(domain)) {
            return null;
        }
        String value = domain.trim();
        while (value.endsWith("/")) {
            value = value.substring(0, value.length() - 1);
        }
        return value;
    }

    private long parsePositiveLong(String value, long fallback) {
        if (!hasText(value)) {
            return fallback;
        }
        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException ignored) {
            return fallback;
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private Map<String, Object> toListItem(FileAttachmentJpaEntity fa) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", fa.getId().toString());
        item.put("fileName", fa.getFileName());
        item.put("originalName", fa.getOriginalName());
        item.put("category", fa.getFileCategory());
        item.put("fileUrl", fa.getFileUrl());
        item.put("size", fa.getFileSize());
        item.put("contentType", fa.getContentType());
        item.put("uploadedBy", fa.getUploadedBy() != null ? fa.getUploadedBy().toString() : null);
        item.put("uploadedAt", fa.getUploadedAt() != null ? fa.getUploadedAt().toString() : null);
        return item;
    }
}

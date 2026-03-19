package com.example.lms.shared.infrastructure.service;

import com.example.lms.shared.infrastructure.persistence.entity.FileAttachmentJpaEntity;
import com.example.lms.shared.infrastructure.persistence.entity.UploadSessionJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.FileAttachmentJpaRepository;
import com.example.lms.shared.infrastructure.persistence.repository.UploadSessionJpaRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@Slf4j
public class PresignedUploadUseCase {

    private static final Duration PRESIGN_TTL = Duration.ofMinutes(5);
    private static final long MAX_VIDEO_UPLOAD_BYTES = 5_000_000_000L; // 5 GB decimal, safe for single-object presigned PUT
    private static final long MULTIPART_VIDEO_THRESHOLD_BYTES = 100_000_000L; // Cloudflare recommends multipart for larger uploads
    private static final long MULTIPART_PART_SIZE_BYTES = 64L * 1024 * 1024L;

    private static final Map<String, Set<String>> ALLOWED_TYPES = Map.of(
            "course-thumbnails", Set.of("image/jpeg", "image/png", "image/webp"),
            "editor-images", Set.of("image/jpeg", "image/png", "image/gif", "image/webp"),
            "videos", Set.of(
                    "video/mp4",
                    "video/webm",
                    "video/quicktime",
                    "video/x-matroska",
                    "video/x-msvideo",
                    "video/avi"
            )
    );

    private static final Map<String, Long> MAX_SIZES = Map.of(
            "course-thumbnails", 5L * 1024 * 1024,
            "editor-images", 50L * 1024 * 1024,
            "videos", MAX_VIDEO_UPLOAD_BYTES
    );

    private final Optional<S3Presigner> r2Presigner;
    private final Optional<R2StorageService> r2StorageService;
    private final Optional<R2VideoStorageService> r2VideoStorageService;
    private final UploadSessionJpaRepository sessionRepository;
    private final FileAttachmentJpaRepository fileAttachmentRepository;

    @Value("${cloudflare.r2.bucket:}")
    private String bucket;

    @Value("${cloudflare.r2.public-url:}")
    private String publicUrl;

    @Autowired
    public PresignedUploadUseCase(
            @Autowired(required = false) S3Presigner r2Presigner,
            @Autowired(required = false) R2StorageService r2StorageService,
            @Autowired(required = false) R2VideoStorageService r2VideoStorageService,
            UploadSessionJpaRepository sessionRepository,
            FileAttachmentJpaRepository fileAttachmentRepository
    ) {
        this.r2Presigner = Optional.ofNullable(r2Presigner);
        this.r2StorageService = Optional.ofNullable(r2StorageService);
        this.r2VideoStorageService = Optional.ofNullable(r2VideoStorageService);
        this.sessionRepository = sessionRepository;
        this.fileAttachmentRepository = fileAttachmentRepository;
    }

    @Transactional
    public InitUploadResult initUpload(String contentType, long fileSize, String folder, UUID userId) {
        String sanitizedFolder = sanitizeFolder(folder);

        Set<String> allowedTypes = ALLOWED_TYPES.getOrDefault(
                sanitizedFolder,
                Set.of("image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf", "video/mp4", "video/webm")
        );
        if (!allowedTypes.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("Unsupported content type: " + contentType);
        }

        long maxSize = MAX_SIZES.getOrDefault(sanitizedFolder, 50L * 1024 * 1024);
        if (fileSize > maxSize) {
            throw new IllegalArgumentException("File exceeds max size: " + humanReadableSize(maxSize));
        }

        boolean videoFolder = isVideoFolder(sanitizedFolder);
        if (videoFolder && r2VideoStorageService.isEmpty()) {
            return new InitUploadResult(null, null, null, true, "SERVER_RELAY", null, null);
        }
        if (!videoFolder && r2Presigner.isEmpty()) {
            return new InitUploadResult(null, null, null, true, "SERVER_RELAY", null, null);
        }

        String extension = mimeToExtension(contentType);
        String storageKey = sanitizedFolder + "/" + UUID.randomUUID() + extension;
        Instant expiresAt = Instant.now().plus(PRESIGN_TTL);
        boolean useMultipartVideoUpload = videoFolder && fileSize > MULTIPART_VIDEO_THRESHOLD_BYTES;

        String uploadUrl = null;
        String uploadStrategy = useMultipartVideoUpload ? "MULTIPART" : "SINGLE_PUT";
        String multipartUploadId = null;

        if (useMultipartVideoUpload) {
            multipartUploadId = r2VideoStorageService.get()
                    .initiateMultipartUpload(storageKey, contentType)
                    .uploadId();
        } else {
            uploadUrl = videoFolder
                    ? r2VideoStorageService.get().presignPut(storageKey, contentType, fileSize, PRESIGN_TTL)
                    : presignPublicUpload(storageKey, contentType, fileSize);
        }

        UploadSessionJpaEntity session = UploadSessionJpaEntity.builder()
                .storageKey(storageKey)
                .userId(userId)
                .contentType(contentType)
                .declaredSize(fileSize)
                .folder(sanitizedFolder)
                .status("PENDING")
                .uploadStrategy(uploadStrategy)
                .multipartUploadId(multipartUploadId)
                .expiresAt(expiresAt)
                .build();
        sessionRepository.save(session);

        log.info("[Upload] Init upload session: key={}, user={}, size={}, videoFolder={}, strategy={}",
                storageKey, userId, fileSize, videoFolder, uploadStrategy);
        return new InitUploadResult(
                uploadUrl,
                storageKey,
                expiresAt,
                false,
                uploadStrategy,
                multipartUploadId,
                useMultipartVideoUpload ? MULTIPART_PART_SIZE_BYTES : null
        );
    }

    @Transactional(readOnly = true)
    public MultipartPartUrlResult createMultipartPartUrl(String storageKey, String uploadId, int partNumber, UUID userId) {
        UploadSessionJpaEntity session = requirePendingSession(storageKey, userId);
        ensureMultipartSession(session, uploadId);

        if (partNumber < 1 || partNumber > 10_000) {
            throw new IllegalArgumentException("Part number must be between 1 and 10000");
        }

        String uploadUrl = r2VideoStorageService.orElseThrow(() -> new IllegalStateException("Private video storage is not available"))
                .presignUploadPart(storageKey, uploadId, partNumber, PRESIGN_TTL);
        return new MultipartPartUrlResult(uploadUrl, partNumber);
    }

    @Transactional
    public void completeMultipartUpload(String storageKey, String uploadId, java.util.List<MultipartUploadedPart> parts, UUID userId) {
        UploadSessionJpaEntity session = requirePendingSession(storageKey, userId);
        ensureMultipartSession(session, uploadId);

        if (parts == null || parts.isEmpty()) {
            throw new IllegalArgumentException("At least one uploaded part is required");
        }

        java.util.List<R2VideoStorageService.CompletedUploadPart> completedParts = parts.stream()
                .map(part -> new R2VideoStorageService.CompletedUploadPart(part.partNumber(), part.eTag()))
                .toList();

        r2VideoStorageService.orElseThrow(() -> new IllegalStateException("Private video storage is not available"))
                .completeMultipartUpload(storageKey, uploadId, completedParts);

        session.setMultipartCompletedAt(Instant.now());
        sessionRepository.save(session);
    }

    @Transactional
    public ConfirmUploadResult confirmUpload(String storageKey, String originalName, UUID userId) {
        UploadSessionJpaEntity session = requirePendingSession(storageKey, userId);

        boolean videoFolder = isVideoFolder(session.getFolder());
        boolean uploaded = videoFolder
                ? r2VideoStorageService.map(service -> service.exists(storageKey)).orElse(false)
                : r2StorageService.map(service -> service.exists(storageKey)).orElse(true);
        if (!uploaded) {
            throw new IllegalStateException("Uploaded file is not present in storage");
        }

        session.setStatus("CONFIRMED");
        session.setConfirmedAt(Instant.now());
        sessionRepository.save(session);

        String fileUrl = videoFolder && r2VideoStorageService.isPresent()
                ? r2VideoStorageService.get().resolveInternalUrl(storageKey)
                : publicUrl + "/" + storageKey;
        String previewUrl = videoFolder && r2VideoStorageService.isPresent()
                ? r2VideoStorageService.get().presignGet(storageKey, PRESIGN_TTL)
                : fileUrl;

        FileAttachmentJpaEntity attachment = FileAttachmentJpaEntity.builder()
                .fileUrl(fileUrl)
                .fileName(storageKey)
                .originalName(originalName != null && !originalName.isBlank() ? originalName : storageKey)
                .fileSize(session.getDeclaredSize())
                .contentType(session.getContentType())
                .uploadedBy(userId)
                .fileCategory(mapFolderToCategory(session.getFolder()))
                .status("ACTIVE")
                .build();
        attachment = fileAttachmentRepository.save(attachment);

        log.info("[Upload] Confirmed presigned upload: key={}, user={}, attachmentId={}, videoFolder={}",
                storageKey, userId, attachment.getId(), videoFolder);

        return new ConfirmUploadResult(attachment.getId(), previewUrl, storageKey);
    }

    private UploadSessionJpaEntity requirePendingSession(String storageKey, UUID userId) {
        UploadSessionJpaEntity session = sessionRepository
                .findByStorageKeyAndUserIdAndStatus(storageKey, userId, "PENDING")
                .orElseThrow(() -> new IllegalArgumentException("Upload session is missing or expired"));

        if (session.getExpiresAt() != null && Instant.now().isAfter(session.getExpiresAt())) {
            session.setStatus("EXPIRED");
            sessionRepository.save(session);
            throw new IllegalArgumentException("Upload session has expired");
        }
        return session;
    }

    private void ensureMultipartSession(UploadSessionJpaEntity session, String uploadId) {
        if (!"MULTIPART".equalsIgnoreCase(session.getUploadStrategy())) {
            throw new IllegalArgumentException("Upload session is not using multipart strategy");
        }
        if (uploadId == null || uploadId.isBlank() || !uploadId.equals(session.getMultipartUploadId())) {
            throw new IllegalArgumentException("Multipart upload identifier does not match the session");
        }
    }

    private String presignPublicUpload(String storageKey, String contentType, long fileSize) {
        PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket(bucket)
                .key(storageKey)
                .contentType(contentType)
                .contentLength(fileSize)
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(PRESIGN_TTL)
                .putObjectRequest(putRequest)
                .build();

        return r2Presigner.get().presignPutObject(presignRequest).url().toString();
    }

    private String sanitizeFolder(String folder) {
        if (folder == null || folder.isBlank()) {
            return "editor-images";
        }
        return folder.replaceAll("[^a-zA-Z0-9_-]", "");
    }

    private String mimeToExtension(String contentType) {
        return switch (contentType.toLowerCase()) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/gif" -> ".gif";
            case "image/webp" -> ".webp";
            case "video/mp4" -> ".mp4";
            case "video/webm" -> ".webm";
            case "video/quicktime" -> ".mov";
            case "video/x-matroska" -> ".mkv";
            case "video/x-msvideo", "video/avi" -> ".avi";
            case "application/pdf" -> ".pdf";
            default -> "";
        };
    }

    private String humanReadableSize(long bytes) {
        if (bytes >= 1_000_000_000L) {
            return (bytes / 1_000_000_000L) + " GB";
        }
        if (bytes >= 1_000_000L) {
            return (bytes / 1_000_000L) + " MB";
        }
        if (bytes >= 1_000L) {
            return (bytes / 1_000L) + " KB";
        }
        return bytes + " bytes";
    }

    private String mapFolderToCategory(String folder) {
        if (folder == null) {
            return "GENERAL";
        }
        return switch (folder) {
            case "course", "course-thumbnails" -> "COURSE_THUMBNAIL";
            case "editor-images", "question-images" -> "EDITOR_IMAGE";
            case "videos" -> "VIDEO";
            default -> "GENERAL";
        };
    }

    private boolean isVideoFolder(String folder) {
        return "videos".equalsIgnoreCase(folder);
    }

    public record InitUploadResult(
            String uploadUrl,
            String storageKey,
            Instant expiresAt,
            boolean isServerRelay,
            String uploadStrategy,
            String multipartUploadId,
            Long multipartPartSizeBytes
    ) {}

    public record ConfirmUploadResult(UUID id, String publicUrl, String storageKey) {}

    public record MultipartPartUrlResult(String uploadUrl, int partNumber) {}

    public record MultipartUploadedPart(int partNumber, String eTag) {}
}

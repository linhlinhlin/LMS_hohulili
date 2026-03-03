package com.example.lms.shared.application.usecase;

import com.example.lms.shared.infrastructure.persistence.entity.FileAttachmentJpaEntity;
import com.example.lms.shared.infrastructure.persistence.entity.UploadSessionJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.FileAttachmentJpaRepository;
import com.example.lms.shared.infrastructure.persistence.repository.UploadSessionJpaRepository;
import com.example.lms.shared.infrastructure.service.R2StorageService;
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

    // MIME whitelist per folder
    private static final Map<String, Set<String>> ALLOWED_TYPES = Map.of(
            "course-thumbnails", Set.of("image/jpeg", "image/png", "image/webp"),
            "editor-images", Set.of("image/jpeg", "image/png", "image/gif", "image/webp"),
            "videos", Set.of("video/mp4", "video/webm", "video/quicktime")
    );

    private static final Map<String, Long> MAX_SIZES = Map.of(
            "course-thumbnails", 5L * 1024 * 1024,        // 5MB
            "editor-images", 50L * 1024 * 1024,            // 50MB
            "videos", 500L * 1024 * 1024                   // 500MB
    );

    private final Optional<S3Presigner> r2Presigner;
    private final Optional<R2StorageService> r2StorageService;
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
            UploadSessionJpaRepository sessionRepository,
            FileAttachmentJpaRepository fileAttachmentRepository) {
        this.r2Presigner = Optional.ofNullable(r2Presigner);
        this.r2StorageService = Optional.ofNullable(r2StorageService);
        this.sessionRepository = sessionRepository;
        this.fileAttachmentRepository = fileAttachmentRepository;
    }

    /**
     * Step 1: Validate input, generate presigned PUT URL, save PENDING session.
     * If presigner not available (dev mode), returns isServerRelay=true for FE fallback.
     */
    @Transactional
    public InitUploadResult initUpload(String contentType, long fileSize, String folder, UUID userId) {
        // Validate folder
        String sanitizedFolder = sanitizeFolder(folder);

        // Validate MIME type
        Set<String> allowedTypes = ALLOWED_TYPES.getOrDefault(sanitizedFolder,
                Set.of("image/jpeg", "image/png", "image/gif", "image/webp",
                        "application/pdf", "video/mp4", "video/webm"));
        if (!allowedTypes.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("Loại tập tin không được phép: " + contentType);
        }

        // Validate size
        long maxSize = MAX_SIZES.getOrDefault(sanitizedFolder, 50L * 1024 * 1024);
        if (fileSize > maxSize) {
            throw new IllegalArgumentException("Tập tin vượt quá dung lượng tối đa: " + (maxSize / 1024 / 1024) + "MB");
        }

        // Dev fallback: no presigner → FE should use server relay
        if (r2Presigner.isEmpty()) {
            return new InitUploadResult(null, null, null, true);
        }

        // Generate storage key
        String extension = mimeToExtension(contentType);
        String storageKey = sanitizedFolder + "/" + UUID.randomUUID() + extension;
        Instant expiresAt = Instant.now().plus(PRESIGN_TTL);

        // Generate presigned PUT URL
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

        String uploadUrl = r2Presigner.get().presignPutObject(presignRequest).url().toString();

        // Save PENDING session
        UploadSessionJpaEntity session = UploadSessionJpaEntity.builder()
                .storageKey(storageKey)
                .userId(userId)
                .contentType(contentType)
                .declaredSize(fileSize)
                .folder(sanitizedFolder)
                .status("PENDING")
                .expiresAt(expiresAt)
                .build();
        sessionRepository.save(session);

        log.info("[Upload] Init presigned upload: key={}, user={}, size={}", storageKey, userId, fileSize);

        return new InitUploadResult(uploadUrl, storageKey, expiresAt, false);
    }

    /**
     * Step 3: Confirm upload — verify object exists in R2, create FileAttachment record.
     */
    @Transactional
    public ConfirmUploadResult confirmUpload(String storageKey, String originalName, UUID userId) {
        // Find PENDING session
        UploadSessionJpaEntity session = sessionRepository
                .findByStorageKeyAndUserIdAndStatus(storageKey, userId, "PENDING")
                .orElseThrow(() -> new IllegalArgumentException("Upload session không tồn tại hoặc đã hết hạn"));

        // Verify the session hasn't expired
        if (session.getExpiresAt() != null && Instant.now().isAfter(session.getExpiresAt())) {
            session.setStatus("EXPIRED");
            sessionRepository.save(session);
            throw new IllegalArgumentException("Upload session đã hết hạn");
        }

        // Verify object exists in R2
        if (r2StorageService.isPresent() && !r2StorageService.get().exists(storageKey)) {
            throw new IllegalStateException("Tập tin chưa được tải lên storage");
        }

        // Update session status
        session.setStatus("CONFIRMED");
        session.setConfirmedAt(Instant.now());
        sessionRepository.save(session);

        // Create FileAttachment record
        String fileUrl = publicUrl + "/" + storageKey;
        FileAttachmentJpaEntity attachment = FileAttachmentJpaEntity.builder()
                .fileUrl(fileUrl)
                .fileName(storageKey)
                .originalName(originalName != null ? originalName : storageKey)
                .fileSize(session.getDeclaredSize())
                .contentType(session.getContentType())
                .uploadedBy(userId)
                .fileCategory(mapFolderToCategory(session.getFolder()))
                .status("ACTIVE")
                .build();
        attachment = fileAttachmentRepository.save(attachment);

        log.info("[Upload] Confirmed presigned upload: key={}, user={}, attachmentId={}", storageKey, userId, attachment.getId());

        return new ConfirmUploadResult(attachment.getId(), fileUrl, storageKey);
    }

    private String sanitizeFolder(String folder) {
        if (folder == null || folder.isBlank()) return "editor-images";
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
            case "application/pdf" -> ".pdf";
            default -> "";
        };
    }

    private String mapFolderToCategory(String folder) {
        if (folder == null) return "GENERAL";
        return switch (folder) {
            case "course", "course-thumbnails" -> "COURSE_THUMBNAIL";
            case "editor-images", "question-images" -> "EDITOR_IMAGE";
            case "videos" -> "VIDEO";
            default -> "GENERAL";
        };
    }

    public record InitUploadResult(String uploadUrl, String storageKey, Instant expiresAt, boolean isServerRelay) {}
    public record ConfirmUploadResult(UUID id, String publicUrl, String storageKey) {}
}

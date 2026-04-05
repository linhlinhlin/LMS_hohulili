package com.example.lms.shared.infrastructure.web;

import com.example.lms.shared.infrastructure.service.LocalStorageService;
import com.example.lms.shared.infrastructure.service.PresignedUploadUseCase;
import com.example.lms.shared.infrastructure.service.R2StorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/v3/files")
@Tag(name = "File Upload V3", description = "File Management (V3) - R2 / Local Storage")
public class FileUploadControllerV3 {

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
        "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
        "application/pdf",
        "video/mp4", "video/webm",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    );

    private static final long MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    private static final long MAX_VIDEO_SIZE = 500L * 1024 * 1024; // Legacy direct-upload ceiling; large videos should use presigned upload

    private static final Set<String> ALLOWED_VIDEO_TYPES = Set.of(
        "video/mp4", "video/webm", "video/quicktime", "video/x-matroska", "video/x-msvideo", "video/avi"
    );

    private final Optional<R2StorageService> r2StorageService;
    private final Optional<LocalStorageService> localStorageService;
    private final com.example.lms.shared.infrastructure.service.FileManagementService fileManagementService;
    private final com.example.lms.shared.infrastructure.persistence.repository.FileAttachmentJpaRepository fileAttachmentRepository;
    private final PresignedUploadUseCase presignedUploadUseCase;

    @Autowired
    public FileUploadControllerV3(
            @Autowired(required = false) R2StorageService r2StorageService,
            @Autowired(required = false) LocalStorageService localStorageService,
            com.example.lms.shared.infrastructure.service.FileManagementService fileManagementService,
            com.example.lms.shared.infrastructure.persistence.repository.FileAttachmentJpaRepository fileAttachmentRepository,
            PresignedUploadUseCase presignedUploadUseCase) {
        this.r2StorageService = Optional.ofNullable(r2StorageService);
        this.localStorageService = Optional.ofNullable(localStorageService);
        this.fileManagementService = fileManagementService;
        this.fileAttachmentRepository = fileAttachmentRepository;
        this.presignedUploadUseCase = presignedUploadUseCase;
    }

    private boolean isStorageAvailable() {
        return r2StorageService.isPresent() || localStorageService.isPresent();
    }

    @PostMapping(value = "/upload/editor", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Upload file for EditorJS (R2 or local storage)")
    public ResponseEntity<Map<String, Object>> uploadForEditor(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folder", defaultValue = "question-images") String folder,
            @AuthenticationPrincipal UserJpaEntity user) {
        try {
            if (!isStorageAvailable()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", 0,
                    "message", "Không thể tải lên: chưa cấu hình storage"
                ));
            }

            // Validate file
            String validationError = validateFile(file);
            if (validationError != null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", 0,
                    "message", validationError
                ));
            }

            // Sanitize folder name
            String sanitizedFolder = sanitizePath(folder);

            if (user == null) {
                return ResponseEntity.status(401).body(Map.of("success", 0, "message", "Không được phép truy cập"));
            }
            UUID uploadedBy = user.getId();
            var attachment = fileManagementService.uploadFile(file, sanitizedFolder, uploadedBy);

            Map<String, Object> fileData = new HashMap<>();
            fileData.put("url", attachment.getFileUrl());
            fileData.put("id", attachment.getId());
            fileData.put("uuid", attachment.getId());
            fileData.put("storageKey", attachment.getFileName());

            Map<String, Object> response = new HashMap<>();
            response.put("success", 1);
            response.put("file", fileData);

            return ResponseEntity.ok(response);

        } catch (IOException | RuntimeException e) {
            log.error("File upload failed", e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", 0,
                "message", "Tải lên thất bại: " + e.getMessage()
            ));
        }
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Upload file (any authenticated user — for assignment submissions, profile, etc.)")
    public ResponseEntity<Map<String, Object>> uploadGeneral(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "category", defaultValue = "document") String category,
            @AuthenticationPrincipal UserJpaEntity user) {
        try {
            if (!isStorageAvailable()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Storage not configured"));
            }
            String validationError = validateFile(file);
            if (validationError != null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", validationError));
            }
            if (user == null) {
                return ResponseEntity.status(401).body(Map.of("success", false, "message", "Unauthorized"));
            }
            String folder = "assignments".equals(category) ? "assignment-files"
                    : "profile".equals(category) ? "profile-files"
                    : "general-uploads";
            var attachment = fileManagementService.uploadFile(file, folder, user.getId());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", Map.of(
                            "id", attachment.getId().toString(),
                            "url", attachment.getFileUrl(),
                            "originalName", file.getOriginalFilename() != null ? file.getOriginalFilename() : "",
                            "fileName", attachment.getFileName(),
                            "size", file.getSize(),
                            "mimeType", file.getContentType() != null ? file.getContentType() : "application/octet-stream"
                    )
            ));
        } catch (IOException | RuntimeException e) {
            log.error("General file upload failed for user {}: {}", user != null ? user.getId() : "?", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("success", false, "message", "Upload failed: " + e.getMessage()));
        }
    }

    @PostMapping(value = "/upload/video", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Upload video file (R2 or local storage)")
    public ResponseEntity<Map<String, Object>> uploadVideo(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserJpaEntity user) {
        try {
            if (!isStorageAvailable()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", 0,
                    "message", "Không thể tải video: chưa cấu hình storage"
                ));
            }

            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", 0, "message", "Tập tin rỗng"));
            }
            if (file.getSize() > MAX_VIDEO_SIZE) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", 0,
                        "message", "Upload video trực tiếp qua backend chỉ hỗ trợ đến 500MB. Với video lớn, hãy dùng flow presigned upload (/api/v3/files/upload/init + /api/v3/files/upload/confirm)."
                ));
            }
            String contentType = file.getContentType();
            if (contentType == null || !ALLOWED_VIDEO_TYPES.contains(contentType.toLowerCase())) {
                return ResponseEntity.badRequest().body(Map.of("success", 0, "message", "Loại video không được phép: " + contentType));
            }

            if (user == null) {
                return ResponseEntity.status(401).body(Map.of("success", 0, "message", "Không được phép truy cập"));
            }
            UUID uploadedBy = user.getId();
            var attachment = fileManagementService.uploadFile(file, "videos", uploadedBy);

            Map<String, Object> fileData = new HashMap<>();
            fileData.put("url", attachment.getFileUrl());
            fileData.put("id", attachment.getId());
            fileData.put("uuid", attachment.getId());
            fileData.put("storageKey", attachment.getFileName());

            Map<String, Object> response = new HashMap<>();
            response.put("success", 1);
            response.put("file", fileData);
            return ResponseEntity.ok(response);

        } catch (IOException | RuntimeException e) {
            log.error("Video upload failed", e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", 0,
                "message", "Tải video thất bại: " + e.getMessage()
            ));
        }
    }

    @DeleteMapping("/{storageKey}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Delete file from storage (R2 or local)")
    public ResponseEntity<Map<String, Object>> deleteFile(
            @AuthenticationPrincipal UserJpaEntity user,
            @PathVariable String storageKey) {
        try {
            if (!isStorageAvailable()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Không thể xóa: chưa cấu hình storage"
                ));
            }

            String sanitizedKey = sanitizePath(storageKey);

            // P1: Verify file ownership — only uploader or admin can delete
            var fileOpt = fileAttachmentRepository.findByFileName(sanitizedKey);
            if (fileOpt.isPresent()) {
                var file = fileOpt.get();
                if (!isAdminRole(user) && !file.getUploadedBy().equals(user.getId())) {
                    return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "message", "Bạn không có quyền xóa tập tin này"
                    ));
                }
            } else {
                // Legacy file without DB record — only admin can delete
                if (!isAdminRole(user)) {
                    return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "message", "Bạn không có quyền xóa tập tin này"
                    ));
                }
            }

            if (r2StorageService.isPresent()) {
                r2StorageService.get().delete(sanitizedKey);
            } else if (localStorageService.isPresent()) {
                localStorageService.get().delete(sanitizedKey);
            }
            log.info("[File] Xóa tập tin '{}' bởi user {}", sanitizedKey,
                    user != null ? user.getId() : "unknown");

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Xóa tập tin thành công"
            ));
        } catch (RuntimeException e) {
            log.error("File deletion failed for key: {}", storageKey, e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "Xóa thất bại: " + e.getMessage()
            ));
        }
    }

    // ============ Presigned Upload Flow ============

    @PostMapping("/upload/init")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Initialize presigned upload — returns presigned PUT URL")
    public ResponseEntity<Map<String, Object>> initUpload(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserJpaEntity user) {
        try {
            if (user == null) {
                return ResponseEntity.status(401).body(Map.of("success", false, "message", "Không được phép truy cập"));
            }

            String contentType = (String) body.get("contentType");
            Number fileSizeNum = (Number) body.get("fileSize");
            String folder = (String) body.getOrDefault("folder", "editor-images");

            if (contentType == null || fileSizeNum == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "contentType và fileSize là bắt buộc"));
            }

            var result = presignedUploadUseCase.initUpload(contentType, fileSizeNum.longValue(), folder, user.getId());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("uploadUrl", result.uploadUrl());
            response.put("storageKey", result.storageKey());
            response.put("expiresAt", result.expiresAt() != null ? result.expiresAt().toString() : null);
            response.put("isServerRelay", result.isServerRelay());
            response.put("uploadStrategy", result.uploadStrategy());
            response.put("multipartUploadId", result.multipartUploadId());
            response.put("multipartPartSizeBytes", result.multipartPartSizeBytes());
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        } catch (RuntimeException e) {
            log.error("Init presigned upload failed", e);
            return ResponseEntity.internalServerError().body(Map.of("success", false, "message", "Khởi tạo upload thất bại"));
        }
    }

    @PostMapping("/upload/confirm")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Confirm presigned upload — verifies file in storage, creates attachment record")
    public ResponseEntity<Map<String, Object>> confirmUpload(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserJpaEntity user) {
        try {
            if (user == null) {
                return ResponseEntity.status(401).body(Map.of("success", false, "message", "Không được phép truy cập"));
            }

            String storageKey = body.get("storageKey");
            String originalName = body.get("originalName");

            if (storageKey == null || storageKey.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "storageKey là bắt buộc"));
            }

            var result = presignedUploadUseCase.confirmUpload(storageKey, originalName, user.getId());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("id", result.id().toString());
            response.put("url", result.publicUrl());
            response.put("storageKey", result.storageKey());
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        } catch (RuntimeException e) {
            log.error("Confirm presigned upload failed", e);
            return ResponseEntity.internalServerError().body(Map.of("success", false, "message", "Xác nhận upload thất bại"));
        }
    }

    @PostMapping("/upload/multipart/part-url")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Sign one multipart upload part URL for direct video upload")
    public ResponseEntity<Map<String, Object>> createMultipartPartUrl(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserJpaEntity user) {
        try {
            if (user == null) {
                return ResponseEntity.status(401).body(Map.of("success", false, "message", "Không được phép truy cập"));
            }

            String storageKey = body.get("storageKey") instanceof String value ? value : null;
            String uploadId = body.get("uploadId") instanceof String value ? value : null;
            Number partNumberValue = body.get("partNumber") instanceof Number value ? value : null;

            if (storageKey == null || uploadId == null || partNumberValue == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "storageKey, uploadId và partNumber là bắt buộc"));
            }

            var result = presignedUploadUseCase.createMultipartPartUrl(
                    storageKey,
                    uploadId,
                    partNumberValue.intValue(),
                    user.getId()
            );
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "uploadUrl", result.uploadUrl(),
                    "partNumber", result.partNumber()
            ));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        } catch (RuntimeException e) {
            log.error("Create multipart part URL failed", e);
            return ResponseEntity.internalServerError().body(Map.of("success", false, "message", "Không thể ký part upload URL"));
        }
    }

    @PostMapping("/upload/multipart/complete")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Complete multipart upload before attachment confirmation")
    public ResponseEntity<Map<String, Object>> completeMultipartUpload(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserJpaEntity user) {
        try {
            if (user == null) {
                return ResponseEntity.status(401).body(Map.of("success", false, "message", "Không được phép truy cập"));
            }

            String storageKey = body.get("storageKey") instanceof String value ? value : null;
            String uploadId = body.get("uploadId") instanceof String value ? value : null;
            Object rawParts = body.get("parts");

            if (storageKey == null || uploadId == null || !(rawParts instanceof List<?> rawPartList)) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "storageKey, uploadId và parts là bắt buộc"));
            }

            List<PresignedUploadUseCase.MultipartUploadedPart> parts = new ArrayList<>();
            for (Object rawPart : rawPartList) {
                if (!(rawPart instanceof Map<?, ?> rawPartMap)) {
                    continue;
                }
                Object partNumberValue = rawPartMap.get("partNumber");
                Object eTagValue = rawPartMap.get("eTag");
                if (!(partNumberValue instanceof Number number) || !(eTagValue instanceof String eTag) || eTag.isBlank()) {
                    return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Mỗi part phải có partNumber và eTag"));
                }
                parts.add(new PresignedUploadUseCase.MultipartUploadedPart(number.intValue(), eTag));
            }

            presignedUploadUseCase.completeMultipartUpload(storageKey, uploadId, parts, user.getId());
            return ResponseEntity.ok(Map.of("success", true));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        } catch (RuntimeException e) {
            log.error("Complete multipart upload failed", e);
            return ResponseEntity.internalServerError().body(Map.of("success", false, "message", "Không thể hoàn tất multipart upload"));
        }
    }

    // ============ Validation Helpers ============

    private String validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return "Tập tin rỗng";
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            return "Tập tin vượt quá dung lượng tối đa 50MB";
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType.toLowerCase())) {
            return "Loại tập tin không được phép: " + contentType;
        }
        String originalName = file.getOriginalFilename();
        if (originalName != null && originalName.contains("..")) {
            return "Tên tập tin không hợp lệ";
        }
        return null;
    }

    private String sanitizePath(String input) {
        if (input == null) return "default";
        return input.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private boolean isAdminRole(UserJpaEntity user) {
        return user != null && (user.getRole() == UserJpaEntity.UserRole.ADMIN
            || user.getRole() == UserJpaEntity.UserRole.ORG_ADMIN);
    }
}

package com.example.lms.shared.infrastructure.web;

import com.example.lms.shared.infrastructure.service.LocalStorageService;
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
    private static final long MAX_VIDEO_SIZE = 500L * 1024 * 1024; // 500MB

    private static final Set<String> ALLOWED_VIDEO_TYPES = Set.of(
        "video/mp4", "video/webm", "video/quicktime"
    );

    private final Optional<R2StorageService> r2StorageService;
    private final Optional<LocalStorageService> localStorageService;
    private final com.example.lms.shared.infrastructure.service.FileManagementService fileManagementService;

    @Autowired
    public FileUploadControllerV3(
            @Autowired(required = false) R2StorageService r2StorageService,
            @Autowired(required = false) LocalStorageService localStorageService,
            com.example.lms.shared.infrastructure.service.FileManagementService fileManagementService) {
        this.r2StorageService = Optional.ofNullable(r2StorageService);
        this.localStorageService = Optional.ofNullable(localStorageService);
        this.fileManagementService = fileManagementService;
    }

    private boolean isStorageAvailable() {
        return r2StorageService.isPresent() || localStorageService.isPresent();
    }

    @PostMapping(value = "/upload/editor", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
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

            UUID uploadedBy = user != null ? user.getId() : UUID.fromString("00000000-0000-0000-0000-000000000000");
            var attachment = fileManagementService.uploadFile(file, sanitizedFolder, uploadedBy);

            Map<String, Object> fileData = new HashMap<>();
            fileData.put("url", attachment.getFileUrl());
            fileData.put("id", attachment.getEntityId());
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
                return ResponseEntity.badRequest().body(Map.of("success", 0, "message", "Video vượt quá dung lượng tối đa 500MB"));
            }
            String contentType = file.getContentType();
            if (contentType == null || !ALLOWED_VIDEO_TYPES.contains(contentType.toLowerCase())) {
                return ResponseEntity.badRequest().body(Map.of("success", 0, "message", "Loại video không được phép: " + contentType));
            }

            UUID uploadedBy = user != null ? user.getId() : UUID.fromString("00000000-0000-0000-0000-000000000000");
            var attachment = fileManagementService.uploadFile(file, "videos", uploadedBy);

            Map<String, Object> fileData = new HashMap<>();
            fileData.put("url", attachment.getFileUrl());
            fileData.put("id", attachment.getEntityId());
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
}

package com.example.lms.shared.infrastructure.web;

import com.example.lms.shared.infrastructure.service.R2StorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
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
@Tag(name = "File Upload V3", description = "File Management (V3) - Cloudflare R2")
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
    private final com.example.lms.shared.infrastructure.service.FileManagementService fileManagementService;

    @Value("${cloudflare.r2.enabled:false}")
    private boolean r2Enabled;

    @Autowired
    public FileUploadControllerV3(
            @Autowired(required = false) R2StorageService r2StorageService,
            com.example.lms.shared.infrastructure.service.FileManagementService fileManagementService) {
        this.r2StorageService = Optional.ofNullable(r2StorageService);
        this.fileManagementService = fileManagementService;
    }

    @PostMapping(value = "/upload/editor", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Upload file to Cloudflare R2 for EditorJS")
    public ResponseEntity<Map<String, Object>> uploadForEditor(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folder", defaultValue = "question-images") String folder,
            @AuthenticationPrincipal UserJpaEntity user) {
        try {
            if (!r2Enabled || r2StorageService.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", 0,
                    "message", "File upload is not available: R2 storage is not configured"
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
                "message", "Upload failed: " + e.getMessage()
            ));
        }
    }

    @PostMapping(value = "/upload/video", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Upload video file to Cloudflare R2")
    public ResponseEntity<Map<String, Object>> uploadVideo(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserJpaEntity user) {
        try {
            if (!r2Enabled || r2StorageService.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", 0,
                    "message", "Video upload is not available: R2 storage is not configured"
                ));
            }

            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", 0, "message", "File is empty"));
            }
            if (file.getSize() > MAX_VIDEO_SIZE) {
                return ResponseEntity.badRequest().body(Map.of("success", 0, "message", "Video size exceeds maximum allowed size of 500MB"));
            }
            String contentType = file.getContentType();
            if (contentType == null || !ALLOWED_VIDEO_TYPES.contains(contentType.toLowerCase())) {
                return ResponseEntity.badRequest().body(Map.of("success", 0, "message", "Video type not allowed: " + contentType));
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
                "message", "Video upload failed: " + e.getMessage()
            ));
        }
    }

    @DeleteMapping("/{storageKey}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Delete file from Cloudflare R2")
    public ResponseEntity<Map<String, Object>> deleteFile(@PathVariable String storageKey) {
        try {
            if (!r2Enabled || r2StorageService.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "File deletion is not available: R2 storage is not configured"
                ));
            }

            String sanitizedKey = sanitizePath(storageKey);
            r2StorageService.get().delete(sanitizedKey);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "File deleted successfully"
            ));
        } catch (RuntimeException e) {
            log.error("File deletion failed for key: {}", storageKey, e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "Delete failed: " + e.getMessage()
            ));
        }
    }

    private String validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return "File is empty";
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            return "File size exceeds maximum allowed size of 50MB";
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType.toLowerCase())) {
            return "File type not allowed: " + contentType;
        }
        String originalName = file.getOriginalFilename();
        if (originalName != null && originalName.contains("..")) {
            return "Invalid filename";
        }
        return null;
    }

    private String sanitizePath(String input) {
        if (input == null) return "default";
        return input.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}

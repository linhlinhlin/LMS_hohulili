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
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

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

    private static final Set<String> ALLOWED_FILE_EXTENSIONS = Set.of(
        "jpg", "jpeg", "png", "gif", "webp", "svg",
        "pdf", "mp4", "webm",
        "doc", "docx", "xls", "xlsx", "ppt", "pptx"
    );

    private static final Set<String> IMAGE_FILE_EXTENSIONS = Set.of(
        "jpg", "jpeg", "png", "gif", "webp", "svg"
    );

    private static final Set<String> DOCUMENT_FILE_EXTENSIONS = Set.of(
        "jpg", "jpeg", "png", "gif", "webp", "svg",
        "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"
    );

    private static final long MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    private static final long MAX_VIDEO_SIZE = 5L * 1024 * 1024 * 1024; // 5GB — matches presigned upload limit when R2 is disabled

    private static final Set<String> AUTHORING_ONLY_FOLDERS = Set.of(
        "videos", "course", "course-thumbnails", "sections", "assignment-instructions"
    );

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
            String sanitizedFolder = sanitizeFolderName(folder);
            String validationError = validateFile(file, allowedExtensionsForFolder(sanitizedFolder));
            if (validationError != null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", 0,
                    "message", validationError
                ));
            }

            if (user == null) {
                return ResponseEntity.status(401).body(Map.of("success", 0, "message", "Không được phép truy cập"));
            }
            if (AUTHORING_ONLY_FOLDERS.contains(sanitizedFolder) && !isAuthoringRole(user)) {
                return ResponseEntity.status(403).body(Map.of("success", 0, "message", "Khong co quyen tai file vao khu vuc nay"));
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
            String validationError = validateFile(file, allowedExtensionsForCategory(category));
            if (validationError != null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", validationError));
            }
            if (user == null) {
                return ResponseEntity.status(401).body(Map.of("success", false, "message", "Unauthorized"));
            }
            String folder = ("assignment".equals(category) || "assignments".equals(category)) ? "assignment-files"
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
                        "message", "Upload video chỉ hỗ trợ tối đa 5GB."
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

    @DeleteMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Delete file from storage (R2 or local)")
    public ResponseEntity<Map<String, Object>> deleteFile(
            @AuthenticationPrincipal UserJpaEntity user,
            @RequestParam String storageKey) {
        try {
            if (!isStorageAvailable()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Không thể xóa: chưa cấu hình storage"
                ));
            }

            String sanitizedKey = validateStorageKey(storageKey);

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

            if (AUTHORING_ONLY_FOLDERS.contains(folder) && !isAuthoringRole(user)) {
                return ResponseEntity.status(403).body(Map.of("success", false,
                    "message", "Chỉ giảng viên và quản trị viên mới được tải lên loại tài nguyên này"));
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

    private String validateFile(MultipartFile file, Set<String> allowedExtensions) {
        if (file == null || file.isEmpty()) {
            return "Tập tin rỗng";
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            return "Tập tin vượt quá dung lượng tối đa 50MB";
        }
        String contentType = file.getContentType();
        String normalizedContentType = contentType != null ? contentType.toLowerCase() : "";
        String extension = extensionOf(file.getOriginalFilename());
        Set<String> contextExtensions = allowedExtensions != null ? allowedExtensions : ALLOWED_FILE_EXTENSIONS;
        if (!contextExtensions.contains(extension)) {
            return "Loai tap tin khong phu hop voi ngu canh tai len";
        }
        if (!ALLOWED_MIME_TYPES.contains(normalizedContentType) && !ALLOWED_FILE_EXTENSIONS.contains(extension)) {
            return "Loại tập tin không được phép: " + contentType;
        }
        String signatureError = validateFileSignature(file, extension, normalizedContentType);
        if (signatureError != null) {
            return signatureError;
        }
        String originalName = file.getOriginalFilename();
        if (originalName != null && originalName.contains("..")) {
            return "Tên tập tin không hợp lệ";
        }
        return null;
    }

    private Set<String> allowedExtensionsForFolder(String folder) {
        return switch (folder) {
            case "editor-images", "question-images", "course-thumbnails", "avatars" -> IMAGE_FILE_EXTENSIONS;
            case "sections", "assignment-instructions", "course" -> DOCUMENT_FILE_EXTENSIONS;
            default -> ALLOWED_FILE_EXTENSIONS;
        };
    }

    private Set<String> allowedExtensionsForCategory(String category) {
        if ("profile".equalsIgnoreCase(category)) {
            return IMAGE_FILE_EXTENSIONS;
        }
        if ("assignment".equalsIgnoreCase(category) || "assignments".equalsIgnoreCase(category)
                || "document".equalsIgnoreCase(category)) {
            return DOCUMENT_FILE_EXTENSIONS;
        }
        return ALLOWED_FILE_EXTENSIONS;
    }

    private String validateFileSignature(MultipartFile file, String extension, String contentType) {
        String expected = expectedFileKind(extension, contentType);
        if (expected == null) {
            return null;
        }
        try {
            return switch (expected) {
                case "jpg", "jpeg" -> startsWith(readHeader(file, 4), 0xFF, 0xD8, 0xFF)
                        ? null : "Noi dung tap tin khong phai JPEG hop le";
                case "png" -> startsWith(readHeader(file, 8), 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)
                        ? null : "Noi dung tap tin khong phai PNG hop le";
                case "gif" -> isGif(readHeader(file, 6))
                        ? null : "Noi dung tap tin khong phai GIF hop le";
                case "webp" -> isWebp(readHeader(file, 12))
                        ? null : "Noi dung tap tin khong phai WebP hop le";
                case "svg" -> isSvg(readHeader(file, 512))
                        ? null : "Noi dung tap tin khong phai SVG hop le";
                case "pdf" -> startsWith(readHeader(file, 5), '%', 'P', 'D', 'F', '-')
                        ? null : "Noi dung tap tin khong phai PDF hop le";
                case "doc", "xls", "ppt" -> startsWith(readHeader(file, 8), 0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1)
                        ? null : "Noi dung tap tin Office khong hop le";
                case "docx" -> zipContainsPrefix(file, "word/")
                        ? null : "Noi dung tap tin DOCX khong hop le";
                case "xlsx" -> zipContainsPrefix(file, "xl/")
                        ? null : "Noi dung tap tin XLSX khong hop le";
                case "pptx" -> zipContainsPrefix(file, "ppt/")
                        ? null : "Noi dung tap tin PPTX khong hop le";
                case "mp4" -> isMp4(readHeader(file, 12))
                        ? null : "Noi dung tap tin khong phai MP4 hop le";
                case "webm" -> startsWith(readHeader(file, 4), 0x1A, 0x45, 0xDF, 0xA3)
                        ? null : "Noi dung tap tin khong phai WebM hop le";
                default -> null;
            };
        } catch (IOException e) {
            return "Khong the doc chu ky tap tin";
        }
    }

    private String expectedFileKind(String extension, String contentType) {
        if (extension != null && !extension.isBlank()) {
            return extension;
        }
        return switch (contentType) {
            case "image/jpeg" -> "jpg";
            case "image/png" -> "png";
            case "image/gif" -> "gif";
            case "image/webp" -> "webp";
            case "image/svg+xml" -> "svg";
            case "application/pdf" -> "pdf";
            case "video/mp4" -> "mp4";
            case "video/webm" -> "webm";
            case "application/msword" -> "doc";
            case "application/vnd.ms-excel" -> "xls";
            case "application/vnd.ms-powerpoint" -> "ppt";
            case "application/vnd.openxmlformats-officedocument.wordprocessingml.document" -> "docx";
            case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" -> "xlsx";
            case "application/vnd.openxmlformats-officedocument.presentationml.presentation" -> "pptx";
            default -> null;
        };
    }

    private byte[] readHeader(MultipartFile file, int length) throws IOException {
        try (InputStream input = file.getInputStream()) {
            return input.readNBytes(length);
        }
    }

    private boolean startsWith(byte[] bytes, int... expected) {
        if (bytes == null || bytes.length < expected.length) {
            return false;
        }
        for (int i = 0; i < expected.length; i++) {
            if ((bytes[i] & 0xFF) != expected[i]) {
                return false;
            }
        }
        return true;
    }

    private boolean isGif(byte[] bytes) {
        String value = new String(bytes, StandardCharsets.US_ASCII);
        return value.equals("GIF87a") || value.equals("GIF89a");
    }

    private boolean isWebp(byte[] bytes) {
        return bytes.length >= 12
                && new String(bytes, 0, 4, StandardCharsets.US_ASCII).equals("RIFF")
                && new String(bytes, 8, 4, StandardCharsets.US_ASCII).equals("WEBP");
    }

    private boolean isSvg(byte[] bytes) {
        String value = new String(bytes, StandardCharsets.UTF_8)
                .replace("\uFEFF", "")
                .trim()
                .toLowerCase(Locale.ROOT);
        return value.startsWith("<svg") || (value.startsWith("<?xml") && value.contains("<svg"));
    }

    private boolean isMp4(byte[] bytes) {
        return bytes.length >= 8 && new String(bytes, 4, 4, StandardCharsets.US_ASCII).equals("ftyp");
    }

    private boolean zipContainsPrefix(MultipartFile file, String requiredPrefix) throws IOException {
        try (ZipInputStream zip = new ZipInputStream(file.getInputStream())) {
            ZipEntry entry;
            int inspected = 0;
            while ((entry = zip.getNextEntry()) != null && inspected < 256) {
                inspected++;
                String name = entry.getName();
                if (name != null && name.startsWith(requiredPrefix)) {
                    return true;
                }
            }
        }
        return false;
    }

    private String extensionOf(String filename) {
        if (filename == null || filename.isBlank()) {
            return "";
        }
        int dot = filename.lastIndexOf('.');
        return dot >= 0 && dot < filename.length() - 1
                ? filename.substring(dot + 1).toLowerCase()
                : "";
    }

    private String sanitizeFolderName(String input) {
        if (input == null) return "default";
        return input.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private String validateStorageKey(String key) {
        if (key == null || key.isBlank()) {
            throw new IllegalArgumentException("storageKey không được để trống");
        }
        if (key.contains("..") || key.contains("//") || key.startsWith("/") || key.endsWith("/")) {
            throw new IllegalArgumentException("storageKey không hợp lệ");
        }
        if (!key.matches("[a-zA-Z0-9._/-]+")) {
            throw new IllegalArgumentException("storageKey chứa ký tự không hợp lệ");
        }
        return key;
    }

    private boolean isAdminRole(UserJpaEntity user) {
        return user != null && (
            user.getRole() == UserJpaEntity.UserRole.ADMIN
            || user.getRole() == UserJpaEntity.UserRole.ORG_ADMIN
        );
    }

    private boolean isAuthoringRole(UserJpaEntity user) {
        if (user == null) return false;
        return user.getRole() == UserJpaEntity.UserRole.TEACHER
            || user.getRole() == UserJpaEntity.UserRole.ADMIN
            || user.getRole() == UserJpaEntity.UserRole.ORG_ADMIN;
    }
}

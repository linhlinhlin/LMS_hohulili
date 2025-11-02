package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.entity.User;
import com.example.lms.service.FileUploadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/uploads")
@RequiredArgsConstructor
@Tag(name = "File Management", description = "API quản lý file upload")
@SecurityRequirement(name = "Bearer Authentication")
public class FileUploadController {

    private final FileUploadService fileUploadService;

    @PostMapping("/file")
    @Operation(summary = "Upload file trực tiếp (multipart)", description = "Upload file lên server local để dùng làm video/bài giảng")
    public ResponseEntity<ApiResponse<FileUploadResponse>> uploadFile(
            @AuthenticationPrincipal User currentUser,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "type", required = false, defaultValue = "video") String type
    ) {
        try {
            FileUploadRequest req = new FileUploadRequest();
            req.setType(type);
            FileUploadResponse res = fileUploadService.uploadFile(file, currentUser, req);
            return ResponseEntity.ok(ApiResponse.success(res));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/signed-url")
    @Operation(summary = "Lấy URL để upload file", description = "Tạo signed URL để upload file lên cloud storage")
    public ResponseEntity<ApiResponse<SignedUrlResponse>> getSignedUrl(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody SignedUrlRequest request
    ) {
        try {
            // Convert SignedUrlRequest to GenerateSignedUrlRequest
            GenerateSignedUrlRequest generateRequest = new GenerateSignedUrlRequest();
            generateRequest.setFileName(request.getFileName());
            generateRequest.setFileSize(request.getFileSize());
            generateRequest.setType(request.getFileType());
            
            SignedUrlResponse response = fileUploadService.generateSignedUrl(currentUser, generateRequest);
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/validate")
    @Operation(summary = "Xác thực file đã upload", description = "Xác thực file đã được upload thành công")
    public ResponseEntity<ApiResponse<String>> validateUpload(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody ValidateUploadRequest request
    ) {
        try {
            boolean isValid = fileUploadService.validateUpload(currentUser, request);
            if (isValid) {
                return ResponseEntity.ok(ApiResponse.success("File đã được upload thành công"));
            } else {
                return ResponseEntity.badRequest().body(ApiResponse.error("File không hợp lệ hoặc chưa được upload"));
            }
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/file")
    @Operation(summary = "Xóa file", description = "Xóa file đã upload")
    public ResponseEntity<ApiResponse<String>> deleteFile(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody DeleteFileRequest request
    ) {
        try {
            fileUploadService.deleteFile(currentUser, request);
            return ResponseEntity.ok(ApiResponse.success("File đã được xóa"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    // DTOs
    public static class SignedUrlRequest {
        @NotBlank(message = "Tên file không được để trống")
        private String fileName;

        @NotBlank(message = "Loại file không được để trống")
        private String fileType;

        private long fileSize;

        @NotBlank(message = "Mục đích upload không được để trống")
        private String purpose; // "assignment", "lesson", "profile", etc.

        private String relatedId; // courseId, assignmentId, etc.

        public SignedUrlRequest() {}

        // Getters and Setters
        public String getFileName() { return fileName; }
        public void setFileName(String fileName) { this.fileName = fileName; }
        public String getFileType() { return fileType; }
        public void setFileType(String fileType) { this.fileType = fileType; }
        public long getFileSize() { return fileSize; }
        public void setFileSize(long fileSize) { this.fileSize = fileSize; }
        public String getPurpose() { return purpose; }
        public void setPurpose(String purpose) { this.purpose = purpose; }
        public String getRelatedId() { return relatedId; }
        public void setRelatedId(String relatedId) { this.relatedId = relatedId; }
    }

    public static class SignedUrlResponse {
        private String uploadUrl;
        private String fileUrl;
        private String fileId;
        private long expiresAt;
        private String method;

        public SignedUrlResponse() {}

        public SignedUrlResponse(String uploadUrl, String fileUrl, String fileId, long expiresAt, String method) {
            this.uploadUrl = uploadUrl;
            this.fileUrl = fileUrl;
            this.fileId = fileId;
            this.expiresAt = expiresAt;
            this.method = method;
        }

        public static SignedUrlResponseBuilder builder() {
            return new SignedUrlResponseBuilder();
        }

        public static class SignedUrlResponseBuilder {
            private String uploadUrl;
            private String fileUrl;
            private String fileName;
            private LocalDateTime expiresAt;

            public SignedUrlResponseBuilder uploadUrl(String uploadUrl) { this.uploadUrl = uploadUrl; return this; }
            public SignedUrlResponseBuilder fileUrl(String fileUrl) { this.fileUrl = fileUrl; return this; }
            public SignedUrlResponseBuilder fileName(String fileName) { this.fileName = fileName; return this; }
            public SignedUrlResponseBuilder expiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; return this; }

            public SignedUrlResponse build() {
                SignedUrlResponse response = new SignedUrlResponse();
                response.uploadUrl = this.uploadUrl;
                response.fileUrl = this.fileUrl;
                response.fileId = this.fileName;
                response.expiresAt = this.expiresAt != null ? 
                    this.expiresAt.atZone(java.time.ZoneId.systemDefault()).toEpochSecond() : 0;
                response.method = "PUT";
                return response;
            }
        }

        // Getters and Setters
        public String getUploadUrl() { return uploadUrl; }
        public void setUploadUrl(String uploadUrl) { this.uploadUrl = uploadUrl; }
        public String getFileUrl() { return fileUrl; }
        public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }
        public String getFileId() { return fileId; }
        public void setFileId(String fileId) { this.fileId = fileId; }
        public long getExpiresAt() { return expiresAt; }
        public void setExpiresAt(long expiresAt) { this.expiresAt = expiresAt; }
        public String getMethod() { return method; }
        public void setMethod(String method) { this.method = method; }
    }

    public static class ValidateUploadRequest {
        @NotBlank(message = "File ID không được để trống")
        private String fileId;

        @NotBlank(message = "File URL không được để trống")
        private String fileUrl;

        public ValidateUploadRequest() {}

        // Getters and Setters
        public String getFileId() { return fileId; }
        public void setFileId(String fileId) { this.fileId = fileId; }
        public String getFileUrl() { return fileUrl; }
        public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }
    }

    public static class DeleteFileRequest {
        @NotBlank(message = "File URL không được để trống")
        private String fileUrl;

        public DeleteFileRequest() {}

        // Getters and Setters
        public String getFileUrl() { return fileUrl; }
        public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }
    }

    public static class FileUploadRequest {
        private String type;

        public FileUploadRequest() {}

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
    }

    public static class FileUploadResponse {
        private String fileName;
        private String originalFileName;
        private String fileUrl;
        private long fileSize;
        private String contentType;
        private LocalDateTime uploadedAt;

        public static FileUploadResponseBuilder builder() {
            return new FileUploadResponseBuilder();
        }

        public static class FileUploadResponseBuilder {
            private String fileName;
            private String originalFileName;
            private String fileUrl;
            private long fileSize;
            private String contentType;
            private LocalDateTime uploadedAt;

            public FileUploadResponseBuilder fileName(String fileName) { this.fileName = fileName; return this; }
            public FileUploadResponseBuilder originalFileName(String originalFileName) { this.originalFileName = originalFileName; return this; }
            public FileUploadResponseBuilder fileUrl(String fileUrl) { this.fileUrl = fileUrl; return this; }
            public FileUploadResponseBuilder fileSize(long fileSize) { this.fileSize = fileSize; return this; }
            public FileUploadResponseBuilder contentType(String contentType) { this.contentType = contentType; return this; }
            public FileUploadResponseBuilder uploadedAt(LocalDateTime uploadedAt) { this.uploadedAt = uploadedAt; return this; }

            public FileUploadResponse build() {
                FileUploadResponse response = new FileUploadResponse();
                response.fileName = this.fileName;
                response.originalFileName = this.originalFileName;
                response.fileUrl = this.fileUrl;
                response.fileSize = this.fileSize;
                response.contentType = this.contentType;
                response.uploadedAt = this.uploadedAt;
                return response;
            }
        }

        // Getters
        public String getFileName() { return fileName; }
        public String getOriginalFileName() { return originalFileName; }
        public String getFileUrl() { return fileUrl; }
        public long getFileSize() { return fileSize; }
        public String getContentType() { return contentType; }
        public LocalDateTime getUploadedAt() { return uploadedAt; }
    }

    public static class GenerateSignedUrlRequest {
        private String fileName;
        private long fileSize;
        private String type;

        public GenerateSignedUrlRequest() {}

        public String getFileName() { return fileName; }
        public void setFileName(String fileName) { this.fileName = fileName; }
        public long getFileSize() { return fileSize; }
        public void setFileSize(long fileSize) { this.fileSize = fileSize; }
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
    }
}
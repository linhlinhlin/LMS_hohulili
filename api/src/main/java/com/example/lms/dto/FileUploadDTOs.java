package com.example.lms.dto;

import java.time.LocalDateTime;
import java.util.UUID;
import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

public class FileUploadDTOs {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SignedUrlRequest {
        @NotBlank(message = "Tên file không được để trống")
        private String fileName;

        @NotBlank(message = "Loại file không được để trống")
        private String fileType;

        private long fileSize;

        @NotBlank(message = "Mục đích upload không được để trống")
        private String purpose; // "assignment", "lesson", "profile", etc.

        private String relatedId; // courseId, assignmentId, etc.
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SignedUrlResponse {
        private String uploadUrl;
        private String fileUrl;
        private String fileId;
        private long expiresAt;
        private String method;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ValidateUploadRequest {
        @NotBlank(message = "File ID không được để trống")
        private String fileId;

        @NotBlank(message = "File URL không được để trống")
        private String fileUrl;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeleteFileRequest {
        @NotBlank(message = "File URL không được để trống")
        private String fileUrl;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FileUploadRequest {
        private String type;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FileUploadResponse {
        private UUID id;
        private String fileName;
        private String originalFileName;
        private String fileUrl;
        private long fileSize;
        private String contentType;
        private LocalDateTime uploadedAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GenerateSignedUrlRequest {
        private String fileName;
        private long fileSize;
        private String type;
    }
}

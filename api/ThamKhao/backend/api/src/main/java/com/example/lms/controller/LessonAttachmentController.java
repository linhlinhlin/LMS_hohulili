package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.entity.LessonAttachment;
import com.example.lms.entity.User;
import com.example.lms.service.LessonAttachmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/lessons")
@RequiredArgsConstructor
@Tag(name = "Lesson Attachments", description = "API quản lý file đính kèm của bài học")
@SecurityRequirement(name = "Bearer Authentication")
public class LessonAttachmentController {

    private final LessonAttachmentService lessonAttachmentService;

    @PostMapping(value = "/{lessonId}/attachments", consumes = "multipart/form-data")
    @Operation(summary = "Thêm file đính kèm cho bài học", description = "Upload và thêm file đính kèm cho bài học")
    public ResponseEntity<ApiResponse<AttachmentDetail>> addAttachment(
            @PathVariable UUID lessonId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "displayOrder", required = false) Integer displayOrder,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            System.out.println("=== ATTACHMENT UPLOAD DEBUG ===");
            System.out.println("Lesson ID: " + lessonId);
            System.out.println("File name: " + (file != null ? file.getOriginalFilename() : "null"));
            System.out.println("File size: " + (file != null ? file.getSize() : "null"));
            System.out.println("Current user: " + (currentUser != null ? currentUser.getUsername() + " (Role: " + currentUser.getRole() + ")" : "null"));
            System.out.println("Display order: " + displayOrder);
            
            LessonAttachment attachment = lessonAttachmentService.addAttachment(lessonId, currentUser, file, displayOrder);
            AttachmentDetail detail = convertToAttachmentDetail(attachment);

            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(detail));
        } catch (RuntimeException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Có lỗi xảy ra";
            if (msg.toLowerCase().contains("quyền")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error(msg));
            }
            if (msg.contains("Không tìm thấy")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(msg));
            }
            return ResponseEntity.badRequest().body(ApiResponse.error(msg));
        }
    }

    @GetMapping("/{lessonId}/attachments")
    @Operation(summary = "Lấy danh sách file đính kèm", description = "Lấy tất cả file đính kèm của một bài học")
    public ResponseEntity<ApiResponse<List<AttachmentDetail>>> getAttachments(
            @PathVariable UUID lessonId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            List<LessonAttachment> attachments = lessonAttachmentService.getAttachmentsByLesson(lessonId, currentUser);
            List<AttachmentDetail> details = attachments.stream()
                    .map(this::convertToAttachmentDetail)
                    .toList();

            return ResponseEntity.ok(ApiResponse.success(details));
        } catch (RuntimeException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Có lỗi xảy ra";
            if (msg.toLowerCase().contains("quyền")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error(msg));
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(msg));
        }
    }

    @DeleteMapping("/attachments/{attachmentId}")
    @Operation(summary = "Xóa file đính kèm", description = "Xóa file đính kèm khỏi bài học")
    public ResponseEntity<ApiResponse<String>> deleteAttachment(
            @PathVariable UUID attachmentId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            lessonAttachmentService.deleteAttachment(attachmentId, currentUser);
            return ResponseEntity.ok(ApiResponse.success("File đính kèm đã được xóa"));
        } catch (RuntimeException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Có lỗi xảy ra";
            if (msg.toLowerCase().contains("quyền")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error(msg));
            }
            return ResponseEntity.badRequest().body(ApiResponse.error(msg));
        }
    }

    @PutMapping("/attachments/{attachmentId}/reorder")
    @Operation(summary = "Thay đổi thứ tự file đính kèm", description = "Cập nhật thứ tự hiển thị của file đính kèm")
    public ResponseEntity<ApiResponse<AttachmentDetail>> reorderAttachment(
            @PathVariable UUID attachmentId,
            @Valid @RequestBody ReorderAttachmentRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            LessonAttachment attachment = lessonAttachmentService.reorderAttachment(attachmentId, currentUser, request.getDisplayOrder());
            AttachmentDetail detail = convertToAttachmentDetail(attachment);

            return ResponseEntity.ok(ApiResponse.success(detail));
        } catch (RuntimeException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Có lỗi xảy ra";
            if (msg.toLowerCase().contains("quyền")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error(msg));
            }
            return ResponseEntity.badRequest().body(ApiResponse.error(msg));
        }
    }

    // Helper method
    private AttachmentDetail convertToAttachmentDetail(LessonAttachment attachment) {
        return AttachmentDetail.builder()
                .id(attachment.getId())
                .fileName(attachment.getFileName())
                .originalFileName(attachment.getOriginalFileName())
                .fileUrl(attachment.getFileUrl())
                .fileSize(attachment.getFileSize())
                .contentType(attachment.getContentType())
                .fileType(attachment.getFileType())
                .displayOrder(attachment.getDisplayOrder())
                .uploadedAt(attachment.getUploadedAt())
                .build();
    }

    // DTOs
    public static class AttachmentDetail {
        private UUID id;
        private String fileName;
        private String originalFileName;
        private String fileUrl;
        private Long fileSize;
        private String contentType;
        private String fileType;
        private Integer displayOrder;
        private java.time.Instant uploadedAt;

        public static AttachmentDetailBuilder builder() {
            return new AttachmentDetailBuilder();
        }

        public static class AttachmentDetailBuilder {
            private UUID id;
            private String fileName;
            private String originalFileName;
            private String fileUrl;
            private Long fileSize;
            private String contentType;
            private String fileType;
            private Integer displayOrder;
            private java.time.Instant uploadedAt;

            public AttachmentDetailBuilder id(UUID id) { this.id = id; return this; }
            public AttachmentDetailBuilder fileName(String fileName) { this.fileName = fileName; return this; }
            public AttachmentDetailBuilder originalFileName(String originalFileName) { this.originalFileName = originalFileName; return this; }
            public AttachmentDetailBuilder fileUrl(String fileUrl) { this.fileUrl = fileUrl; return this; }
            public AttachmentDetailBuilder fileSize(Long fileSize) { this.fileSize = fileSize; return this; }
            public AttachmentDetailBuilder contentType(String contentType) { this.contentType = contentType; return this; }
            public AttachmentDetailBuilder fileType(String fileType) { this.fileType = fileType; return this; }
            public AttachmentDetailBuilder displayOrder(Integer displayOrder) { this.displayOrder = displayOrder; return this; }
            public AttachmentDetailBuilder uploadedAt(java.time.Instant uploadedAt) { this.uploadedAt = uploadedAt; return this; }

            public AttachmentDetail build() {
                AttachmentDetail attachment = new AttachmentDetail();
                attachment.id = this.id;
                attachment.fileName = this.fileName;
                attachment.originalFileName = this.originalFileName;
                attachment.fileUrl = this.fileUrl;
                attachment.fileSize = this.fileSize;
                attachment.contentType = this.contentType;
                attachment.fileType = this.fileType;
                attachment.displayOrder = this.displayOrder;
                attachment.uploadedAt = this.uploadedAt;
                return attachment;
            }
        }

        // Getters
        public UUID getId() { return id; }
        public String getFileName() { return fileName; }
        public String getOriginalFileName() { return originalFileName; }
        public String getFileUrl() { return fileUrl; }
        public Long getFileSize() { return fileSize; }
        public String getContentType() { return contentType; }
        public String getFileType() { return fileType; }
        public Integer getDisplayOrder() { return displayOrder; }
        public java.time.Instant getUploadedAt() { return uploadedAt; }
    }

    public static class ReorderAttachmentRequest {
        @NotNull(message = "Thứ tự hiển thị không được để trống")
        private Integer displayOrder;

        public ReorderAttachmentRequest() {}

        public Integer getDisplayOrder() { return displayOrder; }
        public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }
    }
}
package com.example.lms.dto.ai;

import java.time.Instant;

/**
 * Response DTO cho Frontend khi upload knowledge document
 */
public record KnowledgeUploadResponseDTO(
    String status,          // "success", "error"
    String jobId,           // Job ID để tracking
    String message,         // Human readable message
    String filename,        // Tên file đã upload
    String category,        // Category của document
    Long fileSize,          // Kích thước file (bytes)
    String uploadedBy,      // Username của admin
    String uploadedAt       // ISO timestamp
) {
    public static KnowledgeUploadResponseDTO success(
            String jobId, String filename, String category, 
            Long fileSize, String uploadedBy) {
        return new KnowledgeUploadResponseDTO(
            "success",
            jobId,
            "Tài liệu đã được tải lên và đang được xử lý",
            filename,
            category,
            fileSize,
            uploadedBy,
            Instant.now().toString()
        );
    }
    
    public static KnowledgeUploadResponseDTO error(String message) {
        return new KnowledgeUploadResponseDTO(
            "error", null, message, null, null, null, null, null
        );
    }
}

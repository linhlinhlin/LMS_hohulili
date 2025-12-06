package com.example.lms.dto.ai;

import java.time.Instant;

/**
 * Response DTO cho Frontend khi xóa document
 */
public record DeleteKnowledgeResponseDTO(
    String status,          // "success", "error", "not_found"
    String documentId,
    Integer nodesDeleted,
    String message,
    String deletedBy,
    String deletedAt
) {
    public static DeleteKnowledgeResponseDTO success(
            String documentId, Integer nodesDeleted, String deletedBy) {
        return new DeleteKnowledgeResponseDTO(
            "success",
            documentId,
            nodesDeleted,
            String.format("Đã xóa document và %d nodes liên quan", nodesDeleted),
            deletedBy,
            Instant.now().toString()
        );
    }
    
    public static DeleteKnowledgeResponseDTO notFound(String documentId) {
        return new DeleteKnowledgeResponseDTO(
            "not_found", documentId, 0,
            "Không tìm thấy document này",
            null, null
        );
    }
    
    public static DeleteKnowledgeResponseDTO error(String message) {
        return new DeleteKnowledgeResponseDTO(
            "error", null, null, message, null, null
        );
    }
}

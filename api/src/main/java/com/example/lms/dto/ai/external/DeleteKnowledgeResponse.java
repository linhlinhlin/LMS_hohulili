package com.example.lms.dto.ai.external;

/**
 * Response từ AI Backend khi xóa document
 * Maps to: DELETE /api/v1/knowledge/{document_id}
 */
public record DeleteKnowledgeResponse(
    String status,          // "deleted", "error", "not_found"
    String document_id,
    Integer nodes_deleted,
    String message
) {
    public boolean isDeleted() {
        return "deleted".equals(status);
    }
    
    public boolean isNotFound() {
        return "not_found".equals(status);
    }
}

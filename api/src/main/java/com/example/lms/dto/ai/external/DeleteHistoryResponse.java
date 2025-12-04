package com.example.lms.dto.ai.external;

/**
 * Response từ AI Backend khi xóa lịch sử chat
 * Maps to: DELETE /api/v1/history/{user_id}
 */
public record DeleteHistoryResponse(
    String status,              // "deleted", "error", "not_found"
    String user_id,             // User ID đã xóa
    Integer messages_deleted,   // Số tin nhắn đã xóa
    String message              // Error message (nếu có)
) {
    public boolean isDeleted() {
        return "deleted".equals(status);
    }
    
    public boolean isNotFound() {
        return "not_found".equals(status);
    }
    
    public int getMessagesDeletedCount() {
        return messages_deleted != null ? messages_deleted : 0;
    }
}

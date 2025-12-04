package com.example.lms.dto.ai;

import java.time.Instant;

/**
 * Response DTO cho Frontend khi xóa lịch sử chat
 */
public record DeleteHistoryResponseDTO(
    String status,              // "success", "error", "not_found"
    String userId,              // User ID đã xóa
    Integer messagesDeleted,    // Số tin nhắn đã xóa
    String message,             // Human readable message
    String deletedBy,           // Admin đã thực hiện
    String deletedAt            // ISO timestamp
) {
    public static DeleteHistoryResponseDTO success(
            String userId, Integer messagesDeleted, String deletedBy) {
        return new DeleteHistoryResponseDTO(
            "success",
            userId,
            messagesDeleted,
            String.format("Đã xóa %d tin nhắn của user %s", messagesDeleted, userId),
            deletedBy,
            Instant.now().toString()
        );
    }
    
    public static DeleteHistoryResponseDTO notFound(String userId) {
        return new DeleteHistoryResponseDTO(
            "not_found", userId, 0, 
            "Không tìm thấy lịch sử chat của user này",
            null, null
        );
    }
    
    public static DeleteHistoryResponseDTO error(String message) {
        return new DeleteHistoryResponseDTO(
            "error", null, null, message, null, null
        );
    }
}

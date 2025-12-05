package com.example.lms.dto.ai.external;

/**
 * Request body cho AI Backend Delete History API
 * Maps to: DELETE /api/v1/history/{user_id}
 */
public record DeleteHistoryRequest(
    String role,                // "admin" hoặc "student"
    String requesting_user_id   // ID của người thực hiện lệnh xóa
) {
    public boolean isAdminRequest() {
        return "admin".equals(role);
    }
}

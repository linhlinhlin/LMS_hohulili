package com.example.lms.dto.ai.external;

/**
 * Source DTO từ AI Service response.
 * Chứa thông tin tài liệu tham khảo.
 */
public record AISourceResponse(
    String title,
    String content
) {}

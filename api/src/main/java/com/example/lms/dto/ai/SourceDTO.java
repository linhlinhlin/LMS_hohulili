package com.example.lms.dto.ai;

/**
 * DTO cho source/citation từ AI response.
 * Chứa thông tin tài liệu tham khảo.
 */
public record SourceDTO(
    String title,
    String content,
    String url
) {}

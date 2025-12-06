package com.example.lms.dto.ai;

import java.util.UUID;

/**
 * Context DTO chứa thông tin ngữ cảnh của chat.
 * Giúp AI hiểu user đang ở đâu trong hệ thống.
 */
public record ChatContextDTO(
    UUID courseId,
    UUID lessonId,
    String pageUrl
) {}

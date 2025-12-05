package com.example.lms.dto.ai.external;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Context DTO gửi đến AI Service.
 * Chứa thông tin ngữ cảnh học tập.
 */
public record AIContextRequest(
    @JsonProperty("course_id")
    String courseId,
    
    @JsonProperty("lesson_id")
    String lessonId
) {}

package com.example.lms.dto.ai;

import java.util.List;
import java.util.UUID;

/**
 * Data DTO chứa nội dung response từ AI.
 * Bao gồm answer, sources, suggested questions.
 */
public record ChatDataDTO(
    UUID sessionId,
    UUID messageId,
    String answer,
    List<SourceDTO> sources,
    List<String> suggestedQuestions,
    MetadataDTO metadata
) {}

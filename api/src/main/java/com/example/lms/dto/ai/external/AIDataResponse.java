package com.example.lms.dto.ai.external;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * Data DTO từ AI Service response.
 * Chứa answer, sources, suggested questions.
 */
public record AIDataResponse(
    String answer,
    
    List<AISourceResponse> sources,
    
    @JsonProperty("suggested_questions")
    List<String> suggestedQuestions
) {}

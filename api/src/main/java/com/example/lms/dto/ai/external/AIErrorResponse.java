package com.example.lms.dto.ai.external;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * Error response từ AI Service.
 * Dùng để parse lỗi từ AI Service.
 */
public record AIErrorResponse(
    String error,
    String message,
    List<AIErrorDetail> details,
    
    @JsonProperty("retry_after")
    Integer retryAfter
) {
    public record AIErrorDetail(
        String field,
        String message,
        String code
    ) {}
}

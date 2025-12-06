package com.example.lms.dto.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/**
 * Request DTO cho chat endpoint từ Frontend.
 * Frontend gửi message và optional sessionId/context.
 */
public record ChatRequestDTO(
    @NotBlank(message = "Message không được để trống")
    @Size(min = 1, max = 10000, message = "Message phải từ 1-10000 ký tự")
    String message,
    
    UUID sessionId,
    
    ChatContextDTO context
) {}

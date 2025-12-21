package com.example.lms.ai_assistant.application.dto;

import jakarta.validation.constraints.NotBlank;

public record SendChatMessageCommand(
    @NotBlank String content
) {}

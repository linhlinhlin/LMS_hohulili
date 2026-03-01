package com.example.lms.ai_assistant.application.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SendChatMessageCommand(
    @NotBlank
    @Size(max = 5000, message = "Nội dung tin nhắn không được vượt quá 5000 ký tự")
    @JsonAlias("message")  // Angular frontend sends "message", accept both
    String content
) {}

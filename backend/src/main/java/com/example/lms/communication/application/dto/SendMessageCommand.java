package com.example.lms.communication.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record SendMessageCommand(
    @NotNull UUID recipientId,
    @NotBlank String content,
    UUID assignmentId
) {}

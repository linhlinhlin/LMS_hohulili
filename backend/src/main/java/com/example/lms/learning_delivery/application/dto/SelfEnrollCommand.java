package com.example.lms.learning_delivery.application.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record SelfEnrollCommand(
    @NotNull UUID courseId,
    @NotNull UUID studentId
) {}

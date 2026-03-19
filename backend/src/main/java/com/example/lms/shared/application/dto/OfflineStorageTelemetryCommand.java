package com.example.lms.shared.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.Map;

public record OfflineStorageTelemetryCommand(
        @NotBlank @Size(max = 50) String eventType,
        @NotBlank @Size(max = 30) String availability,
        @Size(max = 30) String recoveryAction,
        @NotBlank @Size(max = 255) String dbName,
        boolean requiresRedownload,
        @Size(max = 255) String errorName,
        @Size(max = 4000) String errorMessage,
        @Size(max = 1024) String route,
        @Size(max = 2048) String userAgent,
        @Size(max = 255) String platform,
        @Size(max = 64) String connectionType,
        @NotNull Instant occurredAt,
        Map<String, Object> payload
) {}

package com.example.lms.shared.application.dto;

import java.time.Instant;
import java.util.UUID;

public record OfflineStorageTelemetryResponse(
        UUID id,
        Instant createdAt
) {}

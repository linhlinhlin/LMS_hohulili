package com.example.lms.shared.application.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.Map;

/**
 * Request DTO for pushing offline changes to server.
 */
public record SyncPushRequest(
        @NotEmpty(message = "Danh sách thao tác không được trống")
        List<SyncOperation> operations
) {
    /**
     * A single sync operation from the offline queue.
     */
    public record SyncOperation(
            String entityType,
            String operationType,
            String endpoint,
            Map<String, Object> payload
    ) {}
}

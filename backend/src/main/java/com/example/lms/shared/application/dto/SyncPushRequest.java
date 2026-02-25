package com.example.lms.shared.application.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;

/**
 * Request DTO for pushing offline changes to server.
 */
public record SyncPushRequest(
        @NotEmpty(message = "Danh sách thao tác không được trống")
        @Size(max = 500, message = "Tối đa 500 thao tác đồng bộ mỗi lần")
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

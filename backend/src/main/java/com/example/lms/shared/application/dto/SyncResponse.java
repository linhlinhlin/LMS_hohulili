package com.example.lms.shared.application.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Response DTOs for sync endpoints.
 */
public final class SyncResponse {

    private SyncResponse() {}

    public record PushResult(
            int accepted,
            int rejected,
            Instant serverTimestamp,
            List<Conflict> conflicts
    ) {
        public static PushResult success(int accepted) {
            return new PushResult(accepted, 0, Instant.now(), List.of());
        }
    }

    public record PullResult(
            Instant serverTimestamp,
            List<Map<String, Object>> changes
    ) {
        public static PullResult empty() {
            return new PullResult(Instant.now(), List.of());
        }
    }

    public record Status(
            Instant serverTimestamp,
            boolean healthy
    ) {
        public static Status ok() {
            return new Status(Instant.now(), true);
        }
    }

    public record Conflict(
            String entityType,
            String entityId,
            String message
    ) {}
}

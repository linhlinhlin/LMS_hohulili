package com.example.lms.shared.application.dto;

import java.time.Instant;

/**
 * Query parameters for filtering audit log entries.
 *
 * <p>Window semantics: {@code [from, to)} half-open interval so adjacent ranges
 * do not double-count the boundary instant (matches the convention used by
 * {@code GetWindowedAnalyticsUseCase}).
 *
 * <p>Empty / null filters are treated as "any value", letting the application
 * layer compose them with existing filters without branching at every call
 * site.
 */
public record AuditLogQuery(
        String tableName,
        String action,
        Instant from,
        Instant to,
        String actorEmail,
        String actorName,
        int page,
        int size
) {
    /**
     * Returns a new query with normalised paging bounds (page >= 0, 1 <= size <= 100).
     */
    public AuditLogQuery normalise() {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 100);
        return new AuditLogQuery(
                blankToNull(tableName),
                blankToNull(action),
                from,
                to,
                blankToNull(actorEmail),
                blankToNull(actorName),
                safePage,
                safeSize
        );
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}

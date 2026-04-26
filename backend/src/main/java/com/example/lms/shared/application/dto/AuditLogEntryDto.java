package com.example.lms.shared.application.dto;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Application-layer projection of an audit log entry. Includes the actor's
 * email and name resolved from the users table so the admin UI does not need
 * to issue a follow-up lookup per row.
 */
public record AuditLogEntryDto(
        Long id,
        String tableName,
        UUID recordId,
        String action,
        Map<String, Object> oldData,
        Map<String, Object> newData,
        UUID changedBy,
        String actorEmail,
        String actorName,
        Instant changedAt
) { }

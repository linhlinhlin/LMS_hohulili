package com.example.lms.shared.domain.model;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Audit Log Entry - Read-only domain model for audit trail.
 * Populated by database triggers on courses, users, enrollments, submissions.
 */
public class AuditLogEntry {

    private Long id;
    private String tableName;
    private UUID recordId;
    private String action;
    private Map<String, Object> oldData;
    private Map<String, Object> newData;
    private UUID changedBy;
    private Instant changedAt;

    private AuditLogEntry() {}

    public static AuditLogEntry reconstitute(Long id, String tableName, UUID recordId,
                                              String action, Map<String, Object> oldData,
                                              Map<String, Object> newData, UUID changedBy,
                                              Instant changedAt) {
        AuditLogEntry entry = new AuditLogEntry();
        entry.id = id;
        entry.tableName = tableName;
        entry.recordId = recordId;
        entry.action = action;
        entry.oldData = oldData;
        entry.newData = newData;
        entry.changedBy = changedBy;
        entry.changedAt = changedAt;
        return entry;
    }

    // Getters
    public Long getId() { return id; }
    public String getTableName() { return tableName; }
    public UUID getRecordId() { return recordId; }
    public String getAction() { return action; }
    public Map<String, Object> getOldData() { return oldData; }
    public Map<String, Object> getNewData() { return newData; }
    public UUID getChangedBy() { return changedBy; }
    public Instant getChangedAt() { return changedAt; }
}

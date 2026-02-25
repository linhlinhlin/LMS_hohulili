package com.example.lms.shared.infrastructure.persistence.entity;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import org.hibernate.annotations.Type;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "audit_log")
public class AuditLogJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "table_name", nullable = false)
    private String tableName;

    @Column(name = "record_id", nullable = false)
    private UUID recordId;

    @Column(nullable = false)
    private String action;

    @Type(JsonType.class)
    @Column(name = "old_data", columnDefinition = "jsonb")
    private Map<String, Object> oldData;

    @Type(JsonType.class)
    @Column(name = "new_data", columnDefinition = "jsonb")
    private Map<String, Object> newData;

    @Column(name = "changed_by")
    private UUID changedBy;

    @Column(name = "changed_at", nullable = false)
    private Instant changedAt;

    public AuditLogJpaEntity() {}

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

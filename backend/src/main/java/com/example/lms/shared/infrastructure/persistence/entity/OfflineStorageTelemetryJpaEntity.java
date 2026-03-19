package com.example.lms.shared.infrastructure.persistence.entity;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Type;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "client_offline_storage_telemetry")
public class OfflineStorageTelemetryJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType;

    @Column(nullable = false, length = 30)
    private String availability;

    @Column(name = "recovery_action", nullable = false, length = 30)
    private String recoveryAction = "none";

    @Column(name = "db_name", nullable = false, length = 255)
    private String dbName;

    @Column(name = "requires_redownload", nullable = false)
    private Boolean requiresRedownload = false;

    @Column(name = "error_name", length = 255)
    private String errorName;

    @Column(name = "error_message", columnDefinition = "text")
    private String errorMessage;

    @Column(length = 1024)
    private String route;

    @Column(name = "user_agent", columnDefinition = "text")
    private String userAgent;

    @Column(length = 255)
    private String platform;

    @Column(name = "connection_type", length = 64)
    private String connectionType;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Type(JsonType.class)
    @Column(name = "payload_json", columnDefinition = "jsonb")
    private Map<String, Object> payloadJson = new HashMap<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public OfflineStorageTelemetryJpaEntity() {}

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private UUID id;
        private UUID userId;
        private String eventType;
        private String availability;
        private String recoveryAction = "none";
        private String dbName;
        private Boolean requiresRedownload = false;
        private String errorName;
        private String errorMessage;
        private String route;
        private String userAgent;
        private String platform;
        private String connectionType;
        private Instant occurredAt;
        private Map<String, Object> payloadJson = new HashMap<>();

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder userId(UUID userId) { this.userId = userId; return this; }
        public Builder eventType(String eventType) { this.eventType = eventType; return this; }
        public Builder availability(String availability) { this.availability = availability; return this; }
        public Builder recoveryAction(String recoveryAction) { this.recoveryAction = recoveryAction; return this; }
        public Builder dbName(String dbName) { this.dbName = dbName; return this; }
        public Builder requiresRedownload(Boolean requiresRedownload) { this.requiresRedownload = requiresRedownload; return this; }
        public Builder errorName(String errorName) { this.errorName = errorName; return this; }
        public Builder errorMessage(String errorMessage) { this.errorMessage = errorMessage; return this; }
        public Builder route(String route) { this.route = route; return this; }
        public Builder userAgent(String userAgent) { this.userAgent = userAgent; return this; }
        public Builder platform(String platform) { this.platform = platform; return this; }
        public Builder connectionType(String connectionType) { this.connectionType = connectionType; return this; }
        public Builder occurredAt(Instant occurredAt) { this.occurredAt = occurredAt; return this; }
        public Builder payloadJson(Map<String, Object> payloadJson) { this.payloadJson = payloadJson; return this; }

        public OfflineStorageTelemetryJpaEntity build() {
            OfflineStorageTelemetryJpaEntity entity = new OfflineStorageTelemetryJpaEntity();
            entity.id = id;
            entity.userId = userId;
            entity.eventType = eventType;
            entity.availability = availability;
            entity.recoveryAction = recoveryAction;
            entity.dbName = dbName;
            entity.requiresRedownload = requiresRedownload;
            entity.errorName = errorName;
            entity.errorMessage = errorMessage;
            entity.route = route;
            entity.userAgent = userAgent;
            entity.platform = platform;
            entity.connectionType = connectionType;
            entity.occurredAt = occurredAt;
            entity.payloadJson = payloadJson;
            return entity;
        }
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getEventType() { return eventType; }
    public String getAvailability() { return availability; }
    public String getRecoveryAction() { return recoveryAction; }
    public String getDbName() { return dbName; }
    public Boolean getRequiresRedownload() { return requiresRedownload; }
    public String getErrorName() { return errorName; }
    public String getErrorMessage() { return errorMessage; }
    public String getRoute() { return route; }
    public String getUserAgent() { return userAgent; }
    public String getPlatform() { return platform; }
    public String getConnectionType() { return connectionType; }
    public Instant getOccurredAt() { return occurredAt; }
    public Map<String, Object> getPayloadJson() { return payloadJson; }
    public Instant getCreatedAt() { return createdAt; }
}

package com.example.lms.shared.domain.model;

import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Append-only client telemetry event for offline storage failures and recovery.
 */
public class OfflineStorageTelemetry {

    private UUID id;
    private UUID userId;
    private String eventType;
    private String availability;
    private String recoveryAction;
    private String dbName;
    private boolean requiresRedownload;
    private String errorName;
    private String errorMessage;
    private String route;
    private String userAgent;
    private String platform;
    private String connectionType;
    private Instant occurredAt;
    private Map<String, Object> payload;
    private Instant createdAt;

    protected OfflineStorageTelemetry() {}

    public static OfflineStorageTelemetry create(
            UUID userId,
            String eventType,
            String availability,
            String recoveryAction,
            String dbName,
            boolean requiresRedownload,
            String errorName,
            String errorMessage,
            String route,
            String userAgent,
            String platform,
            String connectionType,
            Instant occurredAt,
            Map<String, Object> payload
    ) {
        Objects.requireNonNull(userId, "userId không được để trống");
        Objects.requireNonNull(eventType, "eventType không được để trống");
        Objects.requireNonNull(availability, "availability không được để trống");
        Objects.requireNonNull(dbName, "dbName không được để trống");
        Objects.requireNonNull(occurredAt, "occurredAt không được để trống");

        OfflineStorageTelemetry event = new OfflineStorageTelemetry();
        event.id = UUID.randomUUID();
        event.userId = userId;
        event.eventType = eventType;
        event.availability = availability;
        event.recoveryAction = recoveryAction;
        event.dbName = dbName;
        event.requiresRedownload = requiresRedownload;
        event.errorName = errorName;
        event.errorMessage = errorMessage;
        event.route = route;
        event.userAgent = userAgent;
        event.platform = platform;
        event.connectionType = connectionType;
        event.occurredAt = occurredAt;
        event.payload = payload != null
                ? Collections.unmodifiableMap(new HashMap<>(payload))
                : Collections.emptyMap();
        event.createdAt = Instant.now();
        return event;
    }

    public static OfflineStorageTelemetry reconstitute(
            UUID id,
            UUID userId,
            String eventType,
            String availability,
            String recoveryAction,
            String dbName,
            boolean requiresRedownload,
            String errorName,
            String errorMessage,
            String route,
            String userAgent,
            String platform,
            String connectionType,
            Instant occurredAt,
            Map<String, Object> payload,
            Instant createdAt
    ) {
        OfflineStorageTelemetry event = new OfflineStorageTelemetry();
        event.id = id;
        event.userId = userId;
        event.eventType = eventType;
        event.availability = availability;
        event.recoveryAction = recoveryAction;
        event.dbName = dbName;
        event.requiresRedownload = requiresRedownload;
        event.errorName = errorName;
        event.errorMessage = errorMessage;
        event.route = route;
        event.userAgent = userAgent;
        event.platform = platform;
        event.connectionType = connectionType;
        event.occurredAt = occurredAt;
        event.payload = payload != null
                ? Collections.unmodifiableMap(new HashMap<>(payload))
                : Collections.emptyMap();
        event.createdAt = createdAt;
        return event;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getEventType() { return eventType; }
    public String getAvailability() { return availability; }
    public String getRecoveryAction() { return recoveryAction; }
    public String getDbName() { return dbName; }
    public boolean isRequiresRedownload() { return requiresRedownload; }
    public String getErrorName() { return errorName; }
    public String getErrorMessage() { return errorMessage; }
    public String getRoute() { return route; }
    public String getUserAgent() { return userAgent; }
    public String getPlatform() { return platform; }
    public String getConnectionType() { return connectionType; }
    public Instant getOccurredAt() { return occurredAt; }
    public Map<String, Object> getPayload() { return payload; }
    public Instant getCreatedAt() { return createdAt; }
}

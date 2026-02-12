package com.example.lms.learning_delivery.domain.model;

import java.time.Instant;
import java.util.UUID;

public class Notification {
    private UUID id;
    private UUID userId;
    private String type;
    private String title;
    private String message;
    private String link;
    private boolean isRead;
    private Instant createdAt;

    public Notification(UUID id, UUID userId, String type, String title, String message,
                        String link, boolean isRead, Instant createdAt) {
        this.id = id;
        this.userId = userId;
        this.type = type;
        this.title = title;
        this.message = message;
        this.link = link;
        this.isRead = isRead;
        this.createdAt = createdAt;
    }

    public static Notification create(UUID userId, String type, String title, String message, String link) {
        return new Notification(null, userId, type, title, message, link, false, Instant.now());
    }

    public void markAsRead() {
        this.isRead = true;
    }

    // Getters
    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getType() { return type; }
    public String getTitle() { return title; }
    public String getMessage() { return message; }
    public String getLink() { return link; }
    public boolean isRead() { return isRead; }
    public Instant getCreatedAt() { return createdAt; }
}

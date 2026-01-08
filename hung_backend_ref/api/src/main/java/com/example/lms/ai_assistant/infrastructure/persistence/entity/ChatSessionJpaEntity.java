package com.example.lms.ai_assistant.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * JPA Entity for ChatSession persistence.
 */
@Entity
@Table(name = "chat_sessions")
public class ChatSessionJpaEntity {
    // Manual boilerplate
    public ChatSessionJpaEntity() {}
    public ChatSessionJpaEntity(UUID id, UUID userId, String title, String contextType, UUID contextId, Boolean isArchived, Instant createdAt, Instant updatedAt) {
        this.id = id; this.userId = userId; this.title = title; this.contextType = contextType; this.contextId = contextId; this.isArchived = isArchived; this.createdAt = createdAt; this.updatedAt = updatedAt;
    }
    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private UUID id; private UUID userId; private String title; private String contextType = "GENERAL"; private UUID contextId; private Boolean isArchived = false; private Instant createdAt; private Instant updatedAt;
        public Builder id(UUID id) { this.id = id; return this; }
        public Builder userId(UUID userId) { this.userId = userId; return this; }
        public Builder title(String title) { this.title = title; return this; }
        public Builder contextType(String contextType) { this.contextType = contextType; return this; }
        public Builder contextId(UUID contextId) { this.contextId = contextId; return this; }
        public Builder isArchived(Boolean isArchived) { this.isArchived = isArchived; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(Instant updatedAt) { this.updatedAt = updatedAt; return this; }
        public ChatSessionJpaEntity build() { return new ChatSessionJpaEntity(id, userId, title, contextType, contextId, isArchived, createdAt, updatedAt); }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String title;

    @Column(name = "context_type")
    private String contextType = "GENERAL";

    @Column(name = "context_id")
    private UUID contextId;

    @Column(name = "is_archived")
    private Boolean isArchived = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    // Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContextType() { return contextType; }
    public void setContextType(String contextType) { this.contextType = contextType; }
    public UUID getContextId() { return contextId; }
    public void setContextId(UUID contextId) { this.contextId = contextId; }
    public Boolean getIsArchived() { return isArchived; }
    public void setIsArchived(Boolean isArchived) { this.isArchived = isArchived; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}

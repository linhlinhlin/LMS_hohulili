package com.example.lms.ai_assistant.domain.model;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

/**
 * ChatSession Domain Model - Aggregate Root.
 * 
 * Represents a chat conversation session with AI assistant.
 */
public class ChatSession {
    // Manual boilerplate
    public ChatSession(ChatSessionId id, UUID userId, String title, ContextType contextType, UUID contextId, boolean isArchived, Instant createdAt, Instant updatedAt) {
        this.id = id; this.userId = userId; this.title = title; this.contextType = contextType; this.contextId = contextId; this.isArchived = isArchived; this.createdAt = createdAt; this.updatedAt = updatedAt;
    }
    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private ChatSessionId id; private UUID userId; private String title; private ContextType contextType; private UUID contextId; private boolean isArchived; private Instant createdAt; private Instant updatedAt;
        public Builder id(ChatSessionId id) { this.id = id; return this; }
        public Builder userId(UUID userId) { this.userId = userId; return this; }
        public Builder title(String title) { this.title = title; return this; }
        public Builder contextType(ContextType contextType) { this.contextType = contextType; return this; }
        public Builder contextId(UUID contextId) { this.contextId = contextId; return this; }
        public Builder isArchived(boolean isArchived) { this.isArchived = isArchived; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(Instant updatedAt) { this.updatedAt = updatedAt; return this; }
        public ChatSession build() { return new ChatSession(id, userId, title, contextType, contextId, isArchived, createdAt, updatedAt); }
    }

    private ChatSessionId id;
    private UUID userId;
    private String title;
    private ContextType contextType;
    private UUID contextId;
    private boolean isArchived;
    private Instant createdAt;
    private Instant updatedAt;
    
    // Getters
    public ChatSessionId getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getTitle() { return title; }
    public ContextType getContextType() { return contextType; }
    public UUID getContextId() { return contextId; }
    public boolean isArchived() { return isArchived; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    /**
     * Context type for the chat session.
     */
    public enum ContextType {
        GENERAL,
        COURSE,
        LESSON,
        QUIZ,
        ASSIGNMENT
    }

    // ============ Factory Methods ============

    /**
     * Create a new chat session.
     */
    public static ChatSession create(UUID userId, String title, ContextType contextType, UUID contextId) {
        if (userId == null) {
            throw new IllegalArgumentException("User ID is required");
        }

        return ChatSession.builder()
            .id(ChatSessionId.generate())
            .userId(userId)
            .title(title != null ? title : "New Chat")
            .contextType(contextType != null ? contextType : ContextType.GENERAL)
            .contextId(contextId)
            .isArchived(false)
            .createdAt(Instant.now())
            .updatedAt(Instant.now())
            .build();
    }

    /**
     * Reconstitute from persistence.
     */
    public static ChatSession reconstitute(
            ChatSessionId id,
            UUID userId,
            String title,
            ContextType contextType,
            UUID contextId,
            boolean isArchived,
            Instant createdAt,
            Instant updatedAt
    ) {
        return ChatSession.builder()
            .id(id)
            .userId(userId)
            .title(title)
            .contextType(contextType)
            .contextId(contextId)
            .isArchived(isArchived)
            .createdAt(createdAt)
            .updatedAt(updatedAt)
            .build();
    }

    // ============ Business Methods ============

    /**
     * Update session title.
     */
    public void updateTitle(String newTitle) {
        if (newTitle != null && !newTitle.isBlank()) {
            this.title = newTitle;
            this.updatedAt = Instant.now();
        }
    }

    /**
     * Archive the session.
     */
    public void archive() {
        this.isArchived = true;
        this.updatedAt = Instant.now();
    }

    /**
     * Unarchive the session.
     */
    public void unarchive() {
        this.isArchived = false;
        this.updatedAt = Instant.now();
    }

    /**
     * Check if session belongs to user.
     */
    public boolean belongsTo(UUID userId) {
        return this.userId.equals(userId);
    }

    /**
     * Check if session has specific context.
     */
    public boolean hasContext() {
        return this.contextType != ContextType.GENERAL && this.contextId != null;
    }
}

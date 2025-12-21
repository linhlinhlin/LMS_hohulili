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
@Getter
@Builder
public class ChatSession {

    private ChatSessionId id;
    private UUID userId;
    private String title;
    private ContextType contextType;
    private UUID contextId;
    private boolean isArchived;
    private Instant createdAt;
    private Instant updatedAt;

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

package com.example.lms.communication.domain.model;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

/**
 * Message Domain Model - Entity within Conversation Aggregate.
 * 
 * Represents a single message in a conversation between users.
 */
@Getter
@Builder
public class Message {

    private static final int MAX_CONTENT_LENGTH = 5000;

    private MessageId id;
    private ConversationId conversationId;
    private UUID senderId;
    private String content;
    private boolean isRead;
    private Instant createdAt;
    private Instant readAt;

    // ============ Factory Methods ============

    /**
     * Create a new message with validation.
     */
    public static Message create(ConversationId conversationId, UUID senderId, String content) {
        validateContent(content);
        
        return Message.builder()
            .id(MessageId.generate())
            .conversationId(conversationId)
            .senderId(senderId)
            .content(content.trim())
            .isRead(false)
            .createdAt(Instant.now())
            .build();
    }

    /**
     * Reconstitute from persistence.
     */
    public static Message reconstitute(
            MessageId id,
            ConversationId conversationId,
            UUID senderId,
            String content,
            boolean isRead,
            Instant createdAt,
            Instant readAt
    ) {
        return Message.builder()
            .id(id)
            .conversationId(conversationId)
            .senderId(senderId)
            .content(content)
            .isRead(isRead)
            .createdAt(createdAt)
            .readAt(readAt)
            .build();
    }

    // ============ Business Methods ============

    /**
     * Mark message as read.
     */
    public void markAsRead() {
        if (!this.isRead) {
            this.isRead = true;
            this.readAt = Instant.now();
        }
    }

    /**
     * Get preview of message content.
     */
    public String getPreview(int maxLength) {
        if (content == null) return "";
        if (content.length() <= maxLength) return content;
        return content.substring(0, maxLength) + "...";
    }

    /**
     * Check if message is from a specific user.
     */
    public boolean isFrom(UUID userId) {
        return this.senderId.equals(userId);
    }

    // ============ Validation ============

    private static void validateContent(String content) {
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("Message content cannot be empty");
        }
        if (content.length() > MAX_CONTENT_LENGTH) {
            throw new IllegalArgumentException(
                "Message content cannot exceed " + MAX_CONTENT_LENGTH + " characters"
            );
        }
    }
}

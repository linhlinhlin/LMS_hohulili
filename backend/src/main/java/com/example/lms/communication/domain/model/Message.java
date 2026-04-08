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
public class Message {

    // Manual boilerplate
    public Message(MessageId id, ConversationId conversationId, UUID senderId, String content, boolean isRead, Instant createdAt, Instant readAt, boolean recalled, Instant recalledAt) {
        this.id = id; this.conversationId = conversationId; this.senderId = senderId; this.content = content; this.isRead = isRead; this.createdAt = createdAt; this.readAt = readAt; this.recalled = recalled; this.recalledAt = recalledAt;
    }
    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private MessageId id; private ConversationId conversationId; private UUID senderId; private String content; private boolean isRead; private Instant createdAt; private Instant readAt; private boolean recalled; private Instant recalledAt;
        public Builder id(MessageId id) { this.id = id; return this; }
        public Builder conversationId(ConversationId conversationId) { this.conversationId = conversationId; return this; }
        public Builder senderId(UUID senderId) { this.senderId = senderId; return this; }
        public Builder content(String content) { this.content = content; return this; }
        public Builder isRead(boolean isRead) { this.isRead = isRead; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
        public Builder readAt(Instant readAt) { this.readAt = readAt; return this; }
        public Builder recalled(boolean recalled) { this.recalled = recalled; return this; }
        public Builder recalledAt(Instant recalledAt) { this.recalledAt = recalledAt; return this; }
        public Message build() { return new Message(id, conversationId, senderId, content, isRead, createdAt, readAt, recalled, recalledAt); }
    }

    private static final int MAX_CONTENT_LENGTH = 5000;

    private static final int RECALL_WINDOW_MINUTES = 15;

    private MessageId id;
    private ConversationId conversationId;
    private UUID senderId;
    private String content;
    private boolean isRead;
    private Instant createdAt;
    private Instant readAt;
    private boolean recalled;
    private Instant recalledAt;
    private java.util.UUID replyToId;

    // Getters
    public MessageId getId() { return id; }
    public ConversationId getConversationId() { return conversationId; }
    public UUID getSenderId() { return senderId; }
    public String getContent() { return content; }
    /** Get content for display — returns null if recalled */
    public String getDisplayContent() { return recalled ? null : content; }
    public boolean isRead() { return isRead; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getReadAt() { return readAt; }
    public boolean isRecalled() { return recalled; }
    public Instant getRecalledAt() { return recalledAt; }
    public java.util.UUID getReplyToId() { return replyToId; }
    public void setReplyToId(java.util.UUID replyToId) { this.replyToId = replyToId; }

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
            Instant readAt,
            boolean recalled,
            Instant recalledAt
    ) {
        return Message.builder()
            .id(id)
            .conversationId(conversationId)
            .senderId(senderId)
            .content(content)
            .isRead(isRead)
            .createdAt(createdAt)
            .readAt(readAt)
            .recalled(recalled)
            .recalledAt(recalledAt)
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

    /**
     * Check if this message can be recalled (within 15-minute window).
     */
    public boolean canRecall(UUID requesterId) {
        if (!this.senderId.equals(requesterId)) return false;
        if (this.recalled) return false;
        return Instant.now().isBefore(this.createdAt.plusSeconds(RECALL_WINDOW_MINUTES * 60L));
    }

    /**
     * Recall (unsend) this message. Content becomes null, recalled=true.
     */
    public void recall() {
        if (this.recalled) return;
        this.recalled = true;
        this.recalledAt = Instant.now();
        this.content = null;
    }

    // ============ Validation ============

    private static void validateContent(String content) {
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("Nội dung tin nhắn không được để trống");
        }
        if (content.length() > MAX_CONTENT_LENGTH) {
            throw new IllegalArgumentException(
                "Nội dung tin nhắn không được vượt quá " + MAX_CONTENT_LENGTH + " ký tự"
            );
        }
    }
}

package com.example.lms.communication.domain.model;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

/**
 * Conversation Domain Model - Aggregate Root.
 * 
 * Represents a conversation between two users.
 * Contains metadata about the conversation but not the messages themselves.
 */
public class Conversation {
    
    // Manual boilerplate
    public Conversation(ConversationId id, UUID participant1Id, UUID participant2Id, String lastMessagePreview, Instant lastMessageAt, boolean isArchivedByParticipant1, boolean isArchivedByParticipant2, Instant createdAt, Instant updatedAt) {
        this.id = id; this.participant1Id = participant1Id; this.participant2Id = participant2Id; this.lastMessagePreview = lastMessagePreview; this.lastMessageAt = lastMessageAt; this.isArchivedByParticipant1 = isArchivedByParticipant1; this.isArchivedByParticipant2 = isArchivedByParticipant2; this.createdAt = createdAt; this.updatedAt = updatedAt;
    }
    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private ConversationId id; private UUID participant1Id; private UUID participant2Id; private String lastMessagePreview; private Instant lastMessageAt; private boolean isArchivedByParticipant1; private boolean isArchivedByParticipant2; private Instant createdAt; private Instant updatedAt;
        public Builder id(ConversationId id) { this.id = id; return this; }
        public Builder participant1Id(UUID participant1Id) { this.participant1Id = participant1Id; return this; }
        public Builder participant2Id(UUID participant2Id) { this.participant2Id = participant2Id; return this; }
        public Builder lastMessagePreview(String lastMessagePreview) { this.lastMessagePreview = lastMessagePreview; return this; }
        public Builder lastMessageAt(Instant lastMessageAt) { this.lastMessageAt = lastMessageAt; return this; }
        public Builder isArchivedByParticipant1(boolean isArchivedByParticipant1) { this.isArchivedByParticipant1 = isArchivedByParticipant1; return this; }
        public Builder isArchivedByParticipant2(boolean isArchivedByParticipant2) { this.isArchivedByParticipant2 = isArchivedByParticipant2; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(Instant updatedAt) { this.updatedAt = updatedAt; return this; }
        public Conversation build() { return new Conversation(id, participant1Id, participant2Id, lastMessagePreview, lastMessageAt, isArchivedByParticipant1, isArchivedByParticipant2, createdAt, updatedAt); }
    }

    private ConversationId id;
    private UUID participant1Id;
    private UUID participant2Id;
    private String lastMessagePreview;
    private Instant lastMessageAt;
    private boolean isArchivedByParticipant1;
    private boolean isArchivedByParticipant2;
    private Instant createdAt;
    private Instant updatedAt;
    
    // Getters
    public ConversationId getId() { return id; }
    public UUID getParticipant1Id() { return participant1Id; }
    public UUID getParticipant2Id() { return participant2Id; }
    public String getLastMessagePreview() { return lastMessagePreview; }
    public Instant getLastMessageAt() { return lastMessageAt; }
    public boolean isArchivedByParticipant1() { return isArchivedByParticipant1; }
    public boolean isArchivedByParticipant2() { return isArchivedByParticipant2; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    // ============ Factory Methods ============

    /**
     * Create a new conversation between two users.
     */
    public static Conversation create(UUID participant1Id, UUID participant2Id) {
        if (participant1Id == null || participant2Id == null) {
            throw new IllegalArgumentException("Cần có cả hai người tham gia");
        }
        if (participant1Id.equals(participant2Id)) {
            throw new IllegalArgumentException("Không thể tạo cuộc hội thoại với chính mình");
        }

        return Conversation.builder()
            .id(ConversationId.generate())
            .participant1Id(participant1Id)
            .participant2Id(participant2Id)
            .isArchivedByParticipant1(false)
            .isArchivedByParticipant2(false)
            .createdAt(Instant.now())
            .updatedAt(Instant.now())
            .build();
    }

    /**
     * Reconstitute from persistence.
     */
    public static Conversation reconstitute(
            ConversationId id,
            UUID participant1Id,
            UUID participant2Id,
            String lastMessagePreview,
            Instant lastMessageAt,
            boolean isArchivedByParticipant1,
            boolean isArchivedByParticipant2,
            Instant createdAt,
            Instant updatedAt
    ) {
        return Conversation.builder()
            .id(id)
            .participant1Id(participant1Id)
            .participant2Id(participant2Id)
            .lastMessagePreview(lastMessagePreview)
            .lastMessageAt(lastMessageAt)
            .isArchivedByParticipant1(isArchivedByParticipant1)
            .isArchivedByParticipant2(isArchivedByParticipant2)
            .createdAt(createdAt)
            .updatedAt(updatedAt)
            .build();
    }

    // ============ Business Methods ============

    /**
     * Update last message info.
     */
    public void updateLastMessage(String preview, Instant sentAt) {
        this.lastMessagePreview = preview != null && preview.length() > 50 
            ? preview.substring(0, 50) + "..." 
            : preview;
        this.lastMessageAt = sentAt;
        this.updatedAt = Instant.now();
    }

    /**
     * Check if user is participant of this conversation.
     */
    public boolean hasParticipant(UUID userId) {
        return participant1Id.equals(userId) || participant2Id.equals(userId);
    }

    /**
     * Get the other participant.
     */
    public UUID getOtherParticipant(UUID userId) {
        if (participant1Id.equals(userId)) return participant2Id;
        if (participant2Id.equals(userId)) return participant1Id;
        throw new IllegalArgumentException("Người dùng không phải thành viên của cuộc hội thoại này");
    }

    /**
     * Archive conversation for a user.
     */
    public void archiveFor(UUID userId) {
        if (participant1Id.equals(userId)) {
            this.isArchivedByParticipant1 = true;
        } else if (participant2Id.equals(userId)) {
            this.isArchivedByParticipant2 = true;
        }
        this.updatedAt = Instant.now();
    }

    /**
     * Unarchive conversation for a user.
     */
    public void unarchiveFor(UUID userId) {
        if (participant1Id.equals(userId)) {
            this.isArchivedByParticipant1 = false;
        } else if (participant2Id.equals(userId)) {
            this.isArchivedByParticipant2 = false;
        }
        this.updatedAt = Instant.now();
    }

    /**
     * Check if archived for a user.
     */
    public boolean isArchivedFor(UUID userId) {
        if (participant1Id.equals(userId)) return isArchivedByParticipant1;
        if (participant2Id.equals(userId)) return isArchivedByParticipant2;
        return false;
    }
}

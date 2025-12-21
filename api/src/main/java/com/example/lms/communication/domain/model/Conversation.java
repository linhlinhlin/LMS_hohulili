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
@Getter
@Builder
public class Conversation {

    private ConversationId id;
    private UUID participant1Id;
    private UUID participant2Id;
    private String lastMessagePreview;
    private Instant lastMessageAt;
    private boolean isArchivedByParticipant1;
    private boolean isArchivedByParticipant2;
    private Instant createdAt;
    private Instant updatedAt;

    // ============ Factory Methods ============

    /**
     * Create a new conversation between two users.
     */
    public static Conversation create(UUID participant1Id, UUID participant2Id) {
        if (participant1Id == null || participant2Id == null) {
            throw new IllegalArgumentException("Both participants are required");
        }
        if (participant1Id.equals(participant2Id)) {
            throw new IllegalArgumentException("Cannot create a conversation with oneself");
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
        throw new IllegalArgumentException("User is not a participant of this conversation");
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

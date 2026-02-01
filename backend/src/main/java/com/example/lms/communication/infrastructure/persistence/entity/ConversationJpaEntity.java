package com.example.lms.communication.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * JPA Entity for Conversation persistence.
 * Infrastructure layer - separate from domain model.
 */
@Entity
@Table(name = "conversations")
public class ConversationJpaEntity {
    // Manual boilerplate
    public ConversationJpaEntity() {}
    public ConversationJpaEntity(UUID id, UUID participant1Id, UUID participant2Id, Instant lastMessageAt, String lastMessagePreview, Integer unreadCount1, Integer unreadCount2, Boolean isArchived1, Boolean isArchived2, Instant createdAt, Instant updatedAt) {
        this.id = id; this.participant1Id = participant1Id; this.participant2Id = participant2Id; this.lastMessageAt = lastMessageAt; this.lastMessagePreview = lastMessagePreview; this.unreadCount1 = unreadCount1; this.unreadCount2 = unreadCount2; this.isArchived1 = isArchived1; this.isArchived2 = isArchived2; this.createdAt = createdAt; this.updatedAt = updatedAt;
    }
    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private UUID id; private UUID participant1Id; private UUID participant2Id; private Instant lastMessageAt; private String lastMessagePreview; private Integer unreadCount1 = 0; private Integer unreadCount2 = 0; private Boolean isArchived1 = false; private Boolean isArchived2 = false; private Instant createdAt; private Instant updatedAt;
        public Builder id(UUID id) { this.id = id; return this; }
        public Builder participant1Id(UUID participant1Id) { this.participant1Id = participant1Id; return this; }
        public Builder participant2Id(UUID participant2Id) { this.participant2Id = participant2Id; return this; }
        public Builder lastMessageAt(Instant lastMessageAt) { this.lastMessageAt = lastMessageAt; return this; }
        public Builder lastMessagePreview(String lastMessagePreview) { this.lastMessagePreview = lastMessagePreview; return this; }
        public Builder unreadCount1(Integer unreadCount1) { this.unreadCount1 = unreadCount1; return this; }
        public Builder unreadCount2(Integer unreadCount2) { this.unreadCount2 = unreadCount2; return this; }
        public Builder isArchived1(Boolean isArchived1) { this.isArchived1 = isArchived1; return this; }
        public Builder isArchived2(Boolean isArchived2) { this.isArchived2 = isArchived2; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(Instant updatedAt) { this.updatedAt = updatedAt; return this; }
        public ConversationJpaEntity build() { return new ConversationJpaEntity(id, participant1Id, participant2Id, lastMessageAt, lastMessagePreview, unreadCount1, unreadCount2, isArchived1, isArchived2, createdAt, updatedAt); }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "participant1_id", nullable = false)
    private UUID participant1Id;

    @Column(name = "participant2_id", nullable = false)
    private UUID participant2Id;

    @Column(name = "last_message_at")
    private Instant lastMessageAt;

    @Column(name = "last_message_preview")
    private String lastMessagePreview;

    @Column(name = "unread_count_1")
    private Integer unreadCount1 = 0;

    @Column(name = "unread_count_2")
    private Integer unreadCount2 = 0;

    @Column(name = "is_archived_1")
    private Boolean isArchived1 = false;

    @Column(name = "is_archived_2")
    private Boolean isArchived2 = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    // Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getParticipant1Id() { return participant1Id; }
    public void setParticipant1Id(UUID participant1Id) { this.participant1Id = participant1Id; }
    public UUID getParticipant2Id() { return participant2Id; }
    public void setParticipant2Id(UUID participant2Id) { this.participant2Id = participant2Id; }
    public Instant getLastMessageAt() { return lastMessageAt; }
    public void setLastMessageAt(Instant lastMessageAt) { this.lastMessageAt = lastMessageAt; }
    public String getLastMessagePreview() { return lastMessagePreview; }
    public void setLastMessagePreview(String lastMessagePreview) { this.lastMessagePreview = lastMessagePreview; }
    public Integer getUnreadCount1() { return unreadCount1; }
    public void setUnreadCount1(Integer unreadCount1) { this.unreadCount1 = unreadCount1; }
    public Integer getUnreadCount2() { return unreadCount2; }
    public void setUnreadCount2(Integer unreadCount2) { this.unreadCount2 = unreadCount2; }
    public Boolean getIsArchived1() { return isArchived1; }
    public void setIsArchived1(Boolean isArchived1) { this.isArchived1 = isArchived1; }
    public Boolean getIsArchived2() { return isArchived2; }
    public void setIsArchived2(Boolean isArchived2) { this.isArchived2 = isArchived2; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}

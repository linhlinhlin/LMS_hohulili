package com.example.lms.communication.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * JPA Entity for Message persistence.
 * Infrastructure layer - separate from domain model.
 */
@Entity
@Table(name = "messages")
public class MessageJpaEntity {
    // Manual boilerplate
    public MessageJpaEntity() {}
    public MessageJpaEntity(UUID id, UUID conversationId, UUID senderId, String content, Boolean isRead, Instant readAt, Instant sentAt) {
        this.id = id; this.conversationId = conversationId; this.senderId = senderId; this.content = content; this.isRead = isRead; this.readAt = readAt; this.sentAt = sentAt;
    }
    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private UUID id; private UUID conversationId; private UUID senderId; private String content; private Boolean isRead = false; private Instant readAt; private Instant sentAt;
        public Builder id(UUID id) { this.id = id; return this; }
        public Builder conversationId(UUID conversationId) { this.conversationId = conversationId; return this; }
        public Builder senderId(UUID senderId) { this.senderId = senderId; return this; }
        public Builder content(String content) { this.content = content; return this; }
        public Builder isRead(Boolean isRead) { this.isRead = isRead; return this; }
        public Builder readAt(Instant readAt) { this.readAt = readAt; return this; }
        public Builder sentAt(Instant sentAt) { this.sentAt = sentAt; return this; }
        public MessageJpaEntity build() { return new MessageJpaEntity(id, conversationId, senderId, content, isRead, readAt, sentAt); }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "conversation_id", nullable = false)
    private UUID conversationId;

    @Column(name = "sender_id", nullable = false)
    private UUID senderId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "is_read")
    private Boolean isRead = false;

    @Column(name = "read_at")
    private Instant readAt;

    @CreationTimestamp
    @Column(name = "sent_at", updatable = false)
    private Instant sentAt;

    // Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getConversationId() { return conversationId; }
    public void setConversationId(UUID conversationId) { this.conversationId = conversationId; }
    public UUID getSenderId() { return senderId; }
    public void setSenderId(UUID senderId) { this.senderId = senderId; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public Boolean getIsRead() { return isRead; }
    public void setIsRead(Boolean isRead) { this.isRead = isRead; }
    public Instant getReadAt() { return readAt; }
    public void setReadAt(Instant readAt) { this.readAt = readAt; }
    public Instant getSentAt() { return sentAt; }
    public void setSentAt(Instant sentAt) { this.sentAt = sentAt; }
}

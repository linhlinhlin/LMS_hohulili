package com.example.lms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Message Entity
 * 
 * Represents a message between teacher and student.
 */
@Entity
@Table(name = "messages", indexes = {
    @Index(name = "idx_message_conversation", columnList = "conversation_id"),
    @Index(name = "idx_message_sender", columnList = "sender_id"),
    @Index(name = "idx_message_created", columnList = "created_at")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignment_id")
    private Assignment assignmentReference;

    @Column(name = "is_read")
    @Builder.Default
    private Boolean isRead = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // Manual Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Conversation getConversation() { return conversation; }
    public void setConversation(Conversation conversation) { this.conversation = conversation; }
    public User getSender() { return sender; }
    public void setSender(User sender) { this.sender = sender; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public Assignment getAssignmentReference() { return assignmentReference; }
    public void setAssignmentReference(Assignment assignmentReference) { this.assignmentReference = assignmentReference; }
    public Boolean getIsRead() { return isRead; }
    public void setIsRead(Boolean isRead) { this.isRead = isRead; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    // Manual Builder
    public static MessageBuilder builder() { return new MessageBuilder(); }
    public static class MessageBuilder {
        private Message m = new Message();
        public MessageBuilder id(UUID id) { m.setId(id); return this; }
        public MessageBuilder conversation(Conversation conversation) { m.setConversation(conversation); return this; }
        public MessageBuilder sender(User sender) { m.setSender(sender); return this; }
        public MessageBuilder content(String content) { m.setContent(content); return this; }
        public MessageBuilder assignmentReference(Assignment assignmentReference) { m.setAssignmentReference(assignmentReference); return this; }
        public MessageBuilder isRead(Boolean isRead) { m.setIsRead(isRead); return this; }
        public MessageBuilder createdAt(LocalDateTime createdAt) { m.setCreatedAt(createdAt); return this; }
        public Message build() { return m; }
    }
}

package com.example.lms.ai_assistant.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * JPA Entity for ChatMessage persistence.
 */
@Entity
@Table(name = "chat_messages")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MessageRole role;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "tokens_used")
    @Builder.Default
    private Integer tokensUsed = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public enum MessageRole {
        USER, ASSISTANT, SYSTEM
    }
}

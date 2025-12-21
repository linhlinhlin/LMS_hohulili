package com.example.lms.ai_assistant.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * JPA Entity for ChatSession persistence.
 */
@Entity
@Table(name = "chat_sessions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatSessionJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String title;

    @Column(name = "context_type")
    @Builder.Default
    private String contextType = "GENERAL";

    @Column(name = "context_id")
    private UUID contextId;

    @Column(name = "is_archived")
    @Builder.Default
    private Boolean isArchived = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}

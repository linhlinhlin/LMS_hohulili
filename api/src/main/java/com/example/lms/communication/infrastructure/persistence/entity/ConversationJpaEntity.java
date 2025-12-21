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
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationJpaEntity {

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
    @Builder.Default
    private Integer unreadCount1 = 0;

    @Column(name = "unread_count_2")
    @Builder.Default
    private Integer unreadCount2 = 0;

    @Column(name = "is_archived_1")
    @Builder.Default
    private Boolean isArchived1 = false;

    @Column(name = "is_archived_2")
    @Builder.Default
    private Boolean isArchived2 = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}

package com.example.lms.communication.infrastructure.persistence.repository;

import com.example.lms.communication.infrastructure.persistence.entity.MessageJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA Repository for Message (V3).
 */
@Repository("messageJpaRepositoryV3")
public interface MessageJpaRepositoryV3 extends JpaRepository<MessageJpaEntity, UUID> {

    List<MessageJpaEntity> findByConversationIdOrderBySentAtAsc(UUID conversationId);

    List<MessageJpaEntity> findByConversationIdAndIsReadFalse(UUID conversationId);

    long countByConversationIdAndIsReadFalse(UUID conversationId);

    @Modifying
    @Query("UPDATE MessageJpaEntity m SET m.isRead = true WHERE m.conversationId = :convId AND m.senderId != :userId")
    void markAllAsRead(@Param("convId") UUID conversationId, @Param("userId") UUID userId);

    /**
     * Count total unread messages for a user across all active (non-archived) conversations.
     * Single query replaces N+1 pattern: conversations loop + per-conversation unread fetch.
     */
    @Query(value = """
        SELECT COUNT(m.id) FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE m.is_read = false
        AND m.sender_id != :userId
        AND (
            (c.participant1_id = :userId AND (c.is_archived_1 = false OR c.is_archived_1 IS NULL))
            OR
            (c.participant2_id = :userId AND (c.is_archived_2 = false OR c.is_archived_2 IS NULL))
        )
        """, nativeQuery = true)
    long countTotalUnreadForUser(@Param("userId") UUID userId);
}


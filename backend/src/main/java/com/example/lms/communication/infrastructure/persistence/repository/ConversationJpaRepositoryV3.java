package com.example.lms.communication.infrastructure.persistence.repository;

import com.example.lms.communication.infrastructure.persistence.entity.ConversationJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA Repository for Conversation (V3).
 */
@Repository("conversationJpaRepositoryV3")
public interface ConversationJpaRepositoryV3 extends JpaRepository<ConversationJpaEntity, UUID> {

    @Query("SELECT c FROM ConversationJpaEntity c WHERE " +
           "(c.participant1Id = :user1 AND c.participant2Id = :user2) OR " +
           "(c.participant1Id = :user2 AND c.participant2Id = :user1)")
    Optional<ConversationJpaEntity> findByParticipants(@Param("user1") UUID user1, @Param("user2") UUID user2);

    @Query("SELECT c FROM ConversationJpaEntity c WHERE " +
           "c.participant1Id = :userId OR c.participant2Id = :userId " +
           "ORDER BY c.lastMessageAt DESC")
    List<ConversationJpaEntity> findByUserId(@Param("userId") UUID userId);

    List<ConversationJpaEntity> findByParticipant1IdOrParticipant2IdOrderByLastMessageAtDesc(UUID p1, UUID p2);
}


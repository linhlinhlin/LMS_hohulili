package com.example.lms.ai_assistant.infrastructure.persistence.repository;

import com.example.lms.ai_assistant.infrastructure.persistence.entity.ChatSessionJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * JPA Repository for ChatSession entities.
 */
@Repository
public interface ChatSessionJpaRepository extends JpaRepository<ChatSessionJpaEntity, UUID> {

    /**
     * Find all chat sessions for a user, ordered by creation date (newest first).
     */
    List<ChatSessionJpaEntity> findByUserIdOrderByCreatedAtDesc(UUID userId);

    /**
     * Find active (non-archived) sessions for a user.
     */
    List<ChatSessionJpaEntity> findByUserIdAndIsArchivedFalseOrderByCreatedAtDesc(UUID userId);

    /**
     * Find sessions by context type.
     */
    List<ChatSessionJpaEntity> findByUserIdAndContextTypeOrderByCreatedAtDesc(UUID userId, String contextType);
}

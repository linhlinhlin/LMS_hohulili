package com.example.lms.ai_assistant.infrastructure.persistence;

import com.example.lms.ai_assistant.infrastructure.persistence.entity.ChatMessageJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ChatMessageJpaRepository extends JpaRepository<ChatMessageJpaEntity, UUID> {

    List<ChatMessageJpaEntity> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);

    long countBySessionId(UUID sessionId);

    void deleteBySessionId(UUID sessionId);
}

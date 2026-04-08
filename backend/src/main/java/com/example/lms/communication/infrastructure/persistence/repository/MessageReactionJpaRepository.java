package com.example.lms.communication.infrastructure.persistence.repository;

import com.example.lms.communication.infrastructure.persistence.entity.MessageReactionJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MessageReactionJpaRepository extends JpaRepository<MessageReactionJpaEntity, UUID> {
    List<MessageReactionJpaEntity> findByMessageId(UUID messageId);
    List<MessageReactionJpaEntity> findByMessageIdIn(List<UUID> messageIds);
    Optional<MessageReactionJpaEntity> findByMessageIdAndUserIdAndEmoji(UUID messageId, UUID userId, String emoji);
    void deleteByMessageIdAndUserIdAndEmoji(UUID messageId, UUID userId, String emoji);
}

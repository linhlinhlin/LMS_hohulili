package com.example.lms.communication.domain.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Domain repository port for Message aggregate.
 */
public interface MessageRepositoryPort {

    UUID send(UUID conversationId, UUID senderId, String content);

    Optional<Object> findById(UUID id);

    List<Object> findByConversationId(UUID conversationId);

    void markAsRead(UUID id);

    void markAllAsRead(UUID conversationId, UUID userId);
}

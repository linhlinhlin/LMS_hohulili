package com.example.lms.communication.domain.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Domain repository port for Conversation aggregate.
 */
public interface ConversationRepositoryPort {

    UUID create(UUID participant1Id, UUID participant2Id);

    Optional<Object> findById(UUID id);

    Optional<Object> findByParticipants(UUID participant1Id, UUID participant2Id);

    List<Object> findByUserId(UUID userId);

    void updateLastMessage(UUID id, String preview);

    void archive(UUID id, UUID userId);
}

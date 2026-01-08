package com.example.lms.communication.domain.repository;

import com.example.lms.communication.domain.model.Conversation;
import com.example.lms.communication.domain.model.ConversationId;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for Conversation aggregate.
 * Domain layer port - implementations in infrastructure layer.
 */
public interface ConversationRepository {

    /**
     * Save a conversation.
     */
    Conversation save(Conversation conversation);

    /**
     * Find conversation by ID.
     */
    Optional<Conversation> findById(ConversationId id);

    /**
     * Find conversation between two participants.
     */
    Optional<Conversation> findByParticipants(UUID participant1, UUID participant2);

    /**
     * Find all conversations for a user.
     */
    List<Conversation> findByParticipantId(UUID userId);

    /**
     * Find non-archived conversations for a user.
     */
    List<Conversation> findActiveByParticipantId(UUID userId);

    /**
     * Delete a conversation.
     */
    void delete(Conversation conversation);
}

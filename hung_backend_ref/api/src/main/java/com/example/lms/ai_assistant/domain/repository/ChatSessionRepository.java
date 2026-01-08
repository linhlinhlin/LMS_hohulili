package com.example.lms.ai_assistant.domain.repository;

import com.example.lms.ai_assistant.domain.model.ChatSession;
import com.example.lms.ai_assistant.domain.model.ChatSessionId;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for ChatSession aggregate.
 * Domain layer port - implementations in infrastructure layer.
 */
public interface ChatSessionRepository {

    /**
     * Save a chat session.
     */
    ChatSession save(ChatSession session);

    /**
     * Find session by ID.
     */
    Optional<ChatSession> findById(ChatSessionId id);

    /**
     * Find all sessions for a user.
     */
    List<ChatSession> findByUserId(UUID userId);

    /**
     * Find active (non-archived) sessions for a user.
     */
    List<ChatSession> findActiveByUserId(UUID userId);

    /**
     * Delete a session.
     */
    void delete(ChatSession session);

    /**
     * Delete by ID.
     */
    void deleteById(ChatSessionId id);
}

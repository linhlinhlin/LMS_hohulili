package com.example.lms.ai_assistant.domain.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Domain repository port for ChatSession aggregate.
 */
public interface ChatSessionRepositoryPort {

    UUID create(UUID userId, String title, String contextType, UUID contextId);

    Optional<Object> findById(UUID id);

    List<Object> findByUserId(UUID userId);

    void archive(UUID id);

    void deleteById(UUID id);
}

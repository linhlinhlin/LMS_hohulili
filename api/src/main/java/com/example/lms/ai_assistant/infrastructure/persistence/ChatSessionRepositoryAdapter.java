package com.example.lms.ai_assistant.infrastructure.persistence;

import com.example.lms.ai_assistant.domain.model.ChatSession;
import com.example.lms.ai_assistant.domain.model.ChatSessionId;
import com.example.lms.ai_assistant.domain.repository.ChatSessionRepository;
import com.example.lms.ai_assistant.infrastructure.persistence.entity.ChatSessionJpaEntity;
import com.example.lms.ai_assistant.infrastructure.persistence.repository.ChatSessionJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * JPA implementation of ChatSessionRepository.
 * Adapter that bridges domain model and JPA entity.
 */
@Component
@RequiredArgsConstructor
public class ChatSessionRepositoryAdapter implements ChatSessionRepository {

    private final ChatSessionJpaRepository jpaRepository;

    @Override
    public ChatSession save(ChatSession session) {
        ChatSessionJpaEntity entity = toEntity(session);
        ChatSessionJpaEntity saved = jpaRepository.save(entity);
        return toDomain(saved);
    }

    @Override
    public Optional<ChatSession> findById(ChatSessionId id) {
        return jpaRepository.findById(id.value()).map(this::toDomain);
    }

    @Override
    public List<ChatSession> findByUserId(UUID userId) {
        return jpaRepository.findByUserIdOrderByCreatedAtDesc(userId)
            .stream()
            .map(this::toDomain)
            .collect(Collectors.toList());
    }

    @Override
    public List<ChatSession> findActiveByUserId(UUID userId) {
        return jpaRepository.findByUserIdAndIsArchivedFalseOrderByCreatedAtDesc(userId)
            .stream()
            .map(this::toDomain)
            .collect(Collectors.toList());
    }

    @Override
    public void delete(ChatSession session) {
        jpaRepository.deleteById(session.getId().value());
    }

    @Override
    public void deleteById(ChatSessionId id) {
        jpaRepository.deleteById(id.value());
    }

    // ============ Mapping Methods ============

    private ChatSessionJpaEntity toEntity(ChatSession session) {
        return ChatSessionJpaEntity.builder()
            .id(session.getId().value())
            .userId(session.getUserId())
            .title(session.getTitle())
            .contextType(session.getContextType().name())
            .contextId(session.getContextId())
            .isArchived(session.isArchived())
            .build();
    }

    private ChatSession toDomain(ChatSessionJpaEntity entity) {
        ChatSession.ContextType contextType;
        try {
            contextType = ChatSession.ContextType.valueOf(entity.getContextType());
        } catch (Exception e) {
            contextType = ChatSession.ContextType.GENERAL;
        }

        return ChatSession.reconstitute(
            ChatSessionId.of(entity.getId()),
            entity.getUserId(),
            entity.getTitle(),
            contextType,
            entity.getContextId(),
            entity.getIsArchived() != null && entity.getIsArchived(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }
}

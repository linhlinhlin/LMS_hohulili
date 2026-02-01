package com.example.lms.communication.infrastructure.persistence;

import com.example.lms.communication.domain.model.Conversation;
import com.example.lms.communication.domain.model.ConversationId;
import com.example.lms.communication.domain.repository.ConversationRepository;
import com.example.lms.communication.infrastructure.persistence.entity.ConversationJpaEntity;
import com.example.lms.communication.infrastructure.persistence.repository.ConversationJpaRepositoryV3;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * JPA implementation of ConversationRepository.
 * Adapter that bridges domain model and JPA entity.
 */
@Component
public class ConversationRepositoryAdapter implements ConversationRepository {

    public ConversationRepositoryAdapter(ConversationJpaRepositoryV3 jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    private final ConversationJpaRepositoryV3 jpaRepository;

    @Override
    public Conversation save(Conversation conversation) {
        ConversationJpaEntity entity = toEntity(conversation);
        ConversationJpaEntity saved = jpaRepository.save(entity);
        return toDomain(saved);
    }

    @Override
    public Optional<Conversation> findById(ConversationId id) {
        return jpaRepository.findById(id.value()).map(this::toDomain);
    }

    @Override
    public Optional<Conversation> findByParticipants(UUID participant1, UUID participant2) {
        return jpaRepository.findByParticipants(participant1, participant2)
            .map(this::toDomain);
    }

    @Override
    public List<Conversation> findByParticipantId(UUID userId) {
        return jpaRepository.findByParticipant1IdOrParticipant2IdOrderByLastMessageAtDesc(userId, userId)
            .stream()
            .map(this::toDomain)
            .collect(Collectors.toList());
    }

    @Override
    public List<Conversation> findActiveByParticipantId(UUID userId) {
        // Filter non-archived in application layer for simplicity
        return findByParticipantId(userId).stream()
            .filter(c -> !c.isArchivedFor(userId))
            .collect(Collectors.toList());
    }

    @Override
    public void delete(Conversation conversation) {
        jpaRepository.deleteById(conversation.getId().value());
    }

    // ============ Mapping Methods ============

    private ConversationJpaEntity toEntity(Conversation conversation) {
        return ConversationJpaEntity.builder()
            .id(conversation.getId().value())
            .participant1Id(conversation.getParticipant1Id())
            .participant2Id(conversation.getParticipant2Id())
            .lastMessagePreview(conversation.getLastMessagePreview())
            .lastMessageAt(conversation.getLastMessageAt())
            .build();
    }

    private Conversation toDomain(ConversationJpaEntity entity) {
        return Conversation.reconstitute(
            ConversationId.of(entity.getId()),
            entity.getParticipant1Id(),
            entity.getParticipant2Id(),
            entity.getLastMessagePreview(),
            entity.getLastMessageAt(),
            false, // isArchivedByParticipant1 - add to entity if needed
            false, // isArchivedByParticipant2 - add to entity if needed
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }
}

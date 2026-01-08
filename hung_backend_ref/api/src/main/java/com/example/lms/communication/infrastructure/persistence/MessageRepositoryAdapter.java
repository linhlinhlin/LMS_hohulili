package com.example.lms.communication.infrastructure.persistence;

import com.example.lms.communication.domain.model.Message;
import com.example.lms.communication.domain.model.MessageId;
import com.example.lms.communication.domain.model.ConversationId;
import com.example.lms.communication.domain.repository.MessageRepository;
import com.example.lms.communication.infrastructure.persistence.entity.MessageJpaEntity;
import com.example.lms.communication.infrastructure.persistence.repository.MessageJpaRepositoryV3;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * JPA implementation of MessageRepository.
 * Adapter that bridges domain model and JPA entity.
 */
@Component
public class MessageRepositoryAdapter implements MessageRepository {

    public MessageRepositoryAdapter(MessageJpaRepositoryV3 jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    private final MessageJpaRepositoryV3 jpaRepository;

    @Override
    public Message save(Message message) {
        MessageJpaEntity entity = toEntity(message);
        MessageJpaEntity saved = jpaRepository.save(entity);
        return toDomain(saved);
    }

    @Override
    public Optional<Message> findById(MessageId id) {
        return jpaRepository.findById(id.value()).map(this::toDomain);
    }

    @Override
    public List<Message> findByConversationId(ConversationId conversationId) {
        return jpaRepository.findByConversationIdOrderBySentAtAsc(conversationId.value())
            .stream()
            .map(this::toDomain)
            .collect(Collectors.toList());
    }

    @Override
    public List<Message> findUnreadByConversationId(ConversationId conversationId) {
        return jpaRepository.findByConversationIdAndIsReadFalse(conversationId.value())
            .stream()
            .map(this::toDomain)
            .collect(Collectors.toList());
    }

    @Override
    public long countUnreadByConversationId(ConversationId conversationId) {
        return jpaRepository.countByConversationIdAndIsReadFalse(conversationId.value());
    }

    @Override
    public void delete(Message message) {
        jpaRepository.deleteById(message.getId().value());
    }

    // ============ Mapping Methods ============

    private MessageJpaEntity toEntity(Message message) {
        return MessageJpaEntity.builder()
            .id(message.getId().value())
            .conversationId(message.getConversationId().value())
            .senderId(message.getSenderId())
            .content(message.getContent())
            .isRead(message.isRead())
            .build();
    }

    private Message toDomain(MessageJpaEntity entity) {
        return Message.reconstitute(
            MessageId.of(entity.getId()),
            ConversationId.of(entity.getConversationId()),
            entity.getSenderId(),
            entity.getContent(),
            entity.getIsRead() != null && entity.getIsRead(),
            entity.getSentAt(),
            entity.getReadAt()
        );
    }
}


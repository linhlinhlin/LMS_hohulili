package com.example.lms.learning_delivery.infrastructure.persistence;

import com.example.lms.learning_delivery.domain.model.Notification;
import com.example.lms.learning_delivery.domain.repository.NotificationRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.NotificationJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.repository.NotificationJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class NotificationRepositoryAdapter implements NotificationRepository {

    private final NotificationJpaRepository jpaRepository;

    @Override
    public Notification save(Notification domain) {
        NotificationJpaEntity entity = NotificationJpaEntity.builder()
                .id(domain.getId())
                .userId(domain.getUserId())
                .type(domain.getType())
                .title(domain.getTitle())
                .message(domain.getMessage())
                .link(domain.getLink())
                .isRead(domain.isRead())
                .build();
        NotificationJpaEntity saved = jpaRepository.save(entity);
        return toDomain(saved);
    }

    @Override
    public Optional<Notification> findById(UUID id) {
        return jpaRepository.findById(id).map(this::toDomain);
    }

    @Override
    public Page<Notification> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable) {
        return jpaRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable).map(this::toDomain);
    }

    @Override
    public long countByUserIdAndIsReadFalse(UUID userId) {
        return jpaRepository.countByUserIdAndIsReadFalse(userId);
    }

    private Notification toDomain(NotificationJpaEntity entity) {
        return new Notification(
                entity.getId(),
                entity.getUserId(),
                entity.getType(),
                entity.getTitle(),
                entity.getMessage(),
                entity.getLink(),
                entity.getIsRead(),
                entity.getCreatedAt()
        );
    }
}

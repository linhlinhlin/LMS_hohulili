package com.example.lms.learning_delivery.infrastructure.persistence.repository;

import com.example.lms.learning_delivery.infrastructure.persistence.entity.VideoAssetJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VideoAssetJpaRepository extends JpaRepository<VideoAssetJpaEntity, UUID> {

    Optional<VideoAssetJpaEntity> findBySourceAttachmentId(UUID sourceAttachmentId);

    List<VideoAssetJpaEntity> findByIdIn(Collection<UUID> ids);
}

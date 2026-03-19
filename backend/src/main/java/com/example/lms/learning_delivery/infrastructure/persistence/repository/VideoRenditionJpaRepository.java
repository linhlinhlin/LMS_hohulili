package com.example.lms.learning_delivery.infrastructure.persistence.repository;

import com.example.lms.learning_delivery.infrastructure.persistence.entity.VideoRenditionJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface VideoRenditionJpaRepository extends JpaRepository<VideoRenditionJpaEntity, UUID> {

    List<VideoRenditionJpaEntity> findByVideoAssetIdIn(Collection<UUID> videoAssetIds);

    List<VideoRenditionJpaEntity> findByVideoAssetIdOrderByCreatedAtAsc(UUID videoAssetId);

    void deleteByVideoAssetId(UUID videoAssetId);
}

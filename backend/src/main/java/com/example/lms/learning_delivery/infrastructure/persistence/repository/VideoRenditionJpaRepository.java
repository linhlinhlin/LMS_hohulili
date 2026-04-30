package com.example.lms.learning_delivery.infrastructure.persistence.repository;

import com.example.lms.learning_delivery.infrastructure.persistence.entity.VideoRenditionJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface VideoRenditionJpaRepository extends JpaRepository<VideoRenditionJpaEntity, UUID> {

    List<VideoRenditionJpaEntity> findByVideoAssetIdIn(Collection<UUID> videoAssetIds);

    List<VideoRenditionJpaEntity> findByVideoAssetIdOrderByCreatedAtAsc(UUID videoAssetId);

    /**
     * Bulk delete renditions cho 1 asset. Dùng khi re-package — clear partial output.
     * @Modifying + @Transactional bắt buộc cho Spring Data derived delete: nếu thiếu,
     * caller (VideoAssetIngestService.renditionReset) chạy outside transaction context
     * → "No EntityManager with actual transaction available" lúc retry job (issue
     * 2026-04-30 manual retrigger 4 assets có incomplete adaptive packaging).
     */
    @Modifying
    @Transactional
    void deleteByVideoAssetId(UUID videoAssetId);
}

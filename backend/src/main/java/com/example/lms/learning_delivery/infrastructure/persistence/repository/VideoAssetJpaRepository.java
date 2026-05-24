package com.example.lms.learning_delivery.infrastructure.persistence.repository;

import com.example.lms.learning_delivery.infrastructure.persistence.entity.VideoAssetJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VideoAssetJpaRepository extends JpaRepository<VideoAssetJpaEntity, UUID> {

    Optional<VideoAssetJpaEntity> findBySourceAttachmentId(UUID sourceAttachmentId);

    List<VideoAssetJpaEntity> findByIdIn(Collection<UUID> ids);

    List<VideoAssetJpaEntity> findByDuplicateOfAssetId(UUID duplicateOfAssetId);

    long countByDuplicateOfAssetId(UUID duplicateOfAssetId);

    long countByStatus(String status);

    @Query(value = """
            SELECT *
            FROM video_assets asset
            WHERE asset.content_sha256 = :contentSha256
              AND asset.id <> :excludedAssetId
              AND asset.status = 'READY'
              AND asset.adaptive_packaging_status = 'READY'
              AND asset.storage_state = 'ACTIVE'
              AND asset.duplicate_of_asset_id IS NULL
              AND asset.hls_manifest_storage_key IS NOT NULL
            ORDER BY asset.created_at ASC
            LIMIT 1
            """, nativeQuery = true)
    Optional<VideoAssetJpaEntity> findReusableCanonicalAsset(
            @Param("contentSha256") String contentSha256,
            @Param("excludedAssetId") UUID excludedAssetId
    );
}

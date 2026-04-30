package com.example.lms.shared.infrastructure.persistence.repository;

import com.example.lms.shared.infrastructure.persistence.entity.FileAttachmentJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FileAttachmentJpaRepository extends JpaRepository<FileAttachmentJpaEntity, UUID> {
    Optional<FileAttachmentJpaEntity> findByFileUrl(String fileUrl);

    Optional<FileAttachmentJpaEntity> findByFileName(String fileName);

    /**
     * Find true orphan attachments — entity_id NULL and old enough to be eligible for cleanup.
     *
     * Records tagged with {@code entity_type = 'PENDING_LINK_REVIEW'} are explicitly excluded
     * via the {@code entity_id IS NULL} predicate (the tactical backfill sets entity_id to the
     * uploader id alongside the sentinel type, so they no longer match here).
     * This is defensive: even if a future change repopulates entity_id back to NULL on those
     * rows, the additional {@code entity_type} filter below keeps them protected.
     */
    @Query("SELECT f FROM FileAttachmentJpaEntity f " +
           "WHERE f.entityId IS NULL " +
           "AND (f.entityType IS NULL OR f.entityType <> 'PENDING_LINK_REVIEW') " +
           "AND f.uploadedAt < :cutoff")
    List<FileAttachmentJpaEntity> findOrphanedBefore(@Param("cutoff") Instant cutoff);
}

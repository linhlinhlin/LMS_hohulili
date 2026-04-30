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
     * Find true orphan attachments — old enough to be eligible for cleanup AND not referenced
     * by any consumer entity FK column.
     *
     * The query is REFERENTIAL rather than date-based: it explicitly checks every consumer
     * column ({@code courses.thumbnail_attachment_id}, {@code courses.intro_video_attachment_id},
     * {@code users.avatar_attachment_id}, {@code assignment_submissions.file_attachment_id},
     * {@code video_assets.source_attachment_id}) so a file in active use cannot be deleted
     * even if its {@code entity_id} got accidentally cleared. PostgreSQL ON DELETE RESTRICT
     * adds a second physical safety layer at the table level.
     *
     * Records tagged with {@code entity_type = 'PENDING_LINK_REVIEW'} are excluded as a
     * legacy safeguard from the V129 tactical backfill — they will be reviewed manually
     * before deletion. The age cutoff caps how aggressively cleanup runs.
     */
    @Query(value = """
        SELECT * FROM file_attachments f
        WHERE f.uploaded_at < :cutoff
          AND (f.entity_type IS NULL OR f.entity_type <> 'PENDING_LINK_REVIEW')
          AND f.deleted_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM courses c                WHERE c.thumbnail_attachment_id   = f.id)
          AND NOT EXISTS (SELECT 1 FROM courses c                WHERE c.intro_video_attachment_id = f.id)
          AND NOT EXISTS (SELECT 1 FROM users u                  WHERE u.avatar_attachment_id      = f.id)
          AND NOT EXISTS (SELECT 1 FROM assignment_submissions s WHERE s.file_attachment_id        = f.id)
          AND NOT EXISTS (SELECT 1 FROM video_assets v           WHERE v.source_attachment_id      = f.id)
        """,
        nativeQuery = true)
    List<FileAttachmentJpaEntity> findOrphanedBefore(@Param("cutoff") Instant cutoff);
}

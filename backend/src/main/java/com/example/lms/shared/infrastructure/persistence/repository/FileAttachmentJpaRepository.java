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

    @Query("SELECT f FROM FileAttachmentJpaEntity f WHERE f.entityId IS NULL AND f.uploadedAt < :cutoff")
    List<FileAttachmentJpaEntity> findOrphanedBefore(@Param("cutoff") Instant cutoff);
}

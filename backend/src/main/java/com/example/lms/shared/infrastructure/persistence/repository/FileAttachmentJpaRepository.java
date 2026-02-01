package com.example.lms.shared.infrastructure.persistence.repository;

import com.example.lms.shared.infrastructure.persistence.entity.FileAttachmentJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface FileAttachmentJpaRepository extends JpaRepository<FileAttachmentJpaEntity, UUID> {
    java.util.Optional<FileAttachmentJpaEntity> findByFileUrl(String fileUrl);
}

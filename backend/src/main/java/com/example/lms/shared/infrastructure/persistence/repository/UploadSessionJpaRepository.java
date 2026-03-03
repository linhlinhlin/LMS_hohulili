package com.example.lms.shared.infrastructure.persistence.repository;

import com.example.lms.shared.infrastructure.persistence.entity.UploadSessionJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UploadSessionJpaRepository extends JpaRepository<UploadSessionJpaEntity, UUID> {

    Optional<UploadSessionJpaEntity> findByStorageKeyAndUserIdAndStatus(
            String storageKey, UUID userId, String status);

    List<UploadSessionJpaEntity> findByStatusAndExpiresAtBefore(
            String status, Instant cutoff);
}

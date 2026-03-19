package com.example.lms.learning_delivery.infrastructure.persistence.repository;

import com.example.lms.learning_delivery.infrastructure.persistence.entity.VideoIngestJobJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VideoIngestJobJpaRepository extends JpaRepository<VideoIngestJobJpaEntity, UUID> {

    Optional<VideoIngestJobJpaEntity> findByVideoAssetId(UUID videoAssetId);

    List<VideoIngestJobJpaEntity> findByVideoAssetIdIn(Collection<UUID> videoAssetIds);

    @Query("""
            select job
            from VideoIngestJobJpaEntity job
            where job.status in :statuses
              and job.nextRunAt <= :now
            order by job.nextRunAt asc, job.createdAt asc
            """)
    List<VideoIngestJobJpaEntity> findRunnableJobs(
            @Param("statuses") List<String> statuses,
            @Param("now") Instant now
    );
}

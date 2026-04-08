package com.example.lms.communication.infrastructure.persistence.repository;

import com.example.lms.communication.infrastructure.persistence.entity.AnnouncementJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AnnouncementJpaRepository extends JpaRepository<AnnouncementJpaEntity, UUID> {
    List<AnnouncementJpaEntity> findByCourseIdOrderByPublishedAtDesc(UUID courseId);
    List<AnnouncementJpaEntity> findByCourseIdInOrderByPublishedAtDesc(List<UUID> courseIds);
}

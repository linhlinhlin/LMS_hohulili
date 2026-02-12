package com.example.lms.learning_delivery.infrastructure.persistence;

import com.example.lms.learning_delivery.infrastructure.persistence.entity.VideoProgressJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VideoProgressJpaRepository extends JpaRepository<VideoProgressJpaEntity, UUID> {
    Optional<VideoProgressJpaEntity> findByStudentIdAndSectionId(UUID studentId, String sectionId);
    List<VideoProgressJpaEntity> findByStudentIdAndLessonId(UUID studentId, UUID lessonId);
}

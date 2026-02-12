package com.example.lms.learning_delivery.infrastructure.persistence;

import com.example.lms.learning_delivery.domain.model.VideoProgress;
import com.example.lms.learning_delivery.domain.repository.VideoProgressRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.VideoProgressJpaEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class VideoProgressRepositoryAdapter implements VideoProgressRepository {

    private final VideoProgressJpaRepository jpaRepository;

    @Override
    public Optional<VideoProgress> findByStudentAndSection(UUID studentId, String sectionId) {
        return jpaRepository.findByStudentIdAndSectionId(studentId, sectionId)
                .map(this::toDomain);
    }

    @Override
    public List<VideoProgress> findByStudentAndLesson(UUID studentId, UUID lessonId) {
        return jpaRepository.findByStudentIdAndLessonId(studentId, lessonId)
                .stream().map(this::toDomain).toList();
    }

    @Override
    public VideoProgress save(VideoProgress vp) {
        // Try to find existing entity to preserve its JPA-managed ID
        VideoProgressJpaEntity entity = vp.getId() != null
                ? jpaRepository.findById(vp.getId()).orElse(new VideoProgressJpaEntity())
                : jpaRepository.findByStudentIdAndSectionId(vp.getStudentId(), vp.getSectionId())
                    .orElse(new VideoProgressJpaEntity());

        entity.setStudentId(vp.getStudentId());
        entity.setLessonId(vp.getLessonId());
        entity.setSectionId(vp.getSectionId());
        entity.setDurationSeconds(vp.getDurationSeconds());
        entity.setWatchedSegments(vp.getWatchedSegmentsBinary());
        entity.setWatchedSeconds(vp.getWatchedSeconds());
        entity.setProgressPercent(vp.getProgressPercent());
        entity.setCompleted(vp.isCompleted());
        entity.setLastPosition(vp.getLastPosition());
        entity.setCreatedAt(vp.getCreatedAt() != null ? vp.getCreatedAt() : java.time.Instant.now());
        entity.setUpdatedAt(vp.getUpdatedAt() != null ? vp.getUpdatedAt() : java.time.Instant.now());

        VideoProgressJpaEntity saved = jpaRepository.save(entity);
        return toDomain(saved);
    }

    private VideoProgress toDomain(VideoProgressJpaEntity entity) {
        return VideoProgress.builder()
                .id(entity.getId())
                .studentId(entity.getStudentId())
                .lessonId(entity.getLessonId())
                .sectionId(entity.getSectionId())
                .durationSeconds(entity.getDurationSeconds())
                .watchedSegments(VideoProgress.fromBinary(entity.getWatchedSegments()))
                .watchedSeconds(entity.getWatchedSeconds())
                .progressPercent(entity.getProgressPercent())
                .completed(entity.isCompleted())
                .lastPosition(entity.getLastPosition())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}

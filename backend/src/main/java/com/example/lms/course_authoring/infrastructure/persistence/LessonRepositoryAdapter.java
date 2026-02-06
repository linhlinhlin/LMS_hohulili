package com.example.lms.course_authoring.infrastructure.persistence;

import com.example.lms.course_authoring.domain.repository.LessonRepositoryPort;
import com.example.lms.course_authoring.infrastructure.persistence.entity.LessonJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository;
import com.example.lms.shared.domain.model.ContentBlock;
import com.example.lms.shared.exception.EntityNotFoundException;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * JPA Adapter implementing LessonRepositoryPort domain port.
 */
@Repository
public class LessonRepositoryAdapter implements LessonRepositoryPort {

    private final LessonJpaRepository jpaRepository;

    public LessonRepositoryAdapter(LessonJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public UUID save(UUID chapterId, String title, String description, String type,
                     String videoUrl, Integer durationMinutes, Integer orderIndex, Boolean isFree) {
        LessonJpaEntity.LessonType lessonType = LessonJpaEntity.LessonType.VIDEO;
        if (type != null) {
            try {
                lessonType = LessonJpaEntity.LessonType.valueOf(type);
            } catch (IllegalArgumentException ignored) {}
        }

        LessonJpaEntity entity = LessonJpaEntity.builder()
                .chapterId(chapterId)
                .title(title)
                .description(description)
                .type(lessonType)
                .videoUrl(videoUrl)
                .durationMinutes(durationMinutes != null ? durationMinutes : 0)
                .orderIndex(orderIndex != null ? orderIndex : 0)
                .isFree(isFree != null ? isFree : false)
                .build();

        LessonJpaEntity saved = jpaRepository.save(entity);
        return saved.getId();
    }

    @Override
    public boolean existsById(UUID id) {
        return jpaRepository.existsById(id);
    }

    @Override
    public void deleteById(UUID id) {
        jpaRepository.deleteById(id);
    }

    @Override
    public Optional<List<ContentBlock>> getContentBlocks(UUID lessonId) {
        return jpaRepository.findById(lessonId)
                .map(entity -> entity.getContentBlocks() != null
                        ? new ArrayList<>(entity.getContentBlocks())
                        : new ArrayList<>());
    }

    @Override
    public void saveContentBlocks(UUID lessonId, List<ContentBlock> contentBlocks) {
        LessonJpaEntity entity = jpaRepository.findById(lessonId)
                .orElseThrow(() -> new EntityNotFoundException("Lesson", lessonId));
        entity.setContentBlocks(contentBlocks != null ? contentBlocks : new ArrayList<>());
        jpaRepository.save(entity);
    }
}

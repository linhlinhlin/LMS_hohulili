package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.infrastructure.persistence.entity.LessonJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.mapper.LessonEntityMapper;
import com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Use case for creating a lesson in a chapter.
 * V3 - Uses pure domain models only.
 */
@Service("createLessonUseCaseV3")
@RequiredArgsConstructor
@Slf4j
public class CreateLessonUseCaseV3 {

    private final LessonJpaRepository lessonRepository;
    private final LessonEntityMapper mapper;

    public record CreateLessonCommand(
        UUID chapterId,
        String title,
        String description,
        String type,
        String videoUrl,
        Integer durationMinutes,
        Integer orderIndex,
        Boolean isFree
    ) {}

    @Transactional
    public UUID execute(CreateLessonCommand command) {
        log.info("Creating lesson {} for chapter {} (V3)", command.title(), command.chapterId());

        LessonJpaEntity.LessonType lessonType = LessonJpaEntity.LessonType.VIDEO;
        try {
            lessonType = LessonJpaEntity.LessonType.valueOf(command.type());
        } catch (Exception ignored) {}

        LessonJpaEntity entity = mapper.toEntity(
            command.chapterId(),
            command.title(),
            command.description(),
            lessonType,
            command.videoUrl(),
            command.durationMinutes(),
            command.orderIndex(),
            command.isFree()
        );

        LessonJpaEntity saved = lessonRepository.save(entity);
        
        log.info("Lesson {} created with ID {} (V3)", command.title(), saved.getId());
        return saved.getId();
    }
}

package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.domain.repository.LessonRepositoryPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Use case for creating a lesson in a chapter.
 * V3 - Uses domain repository port only.
 */
@Service("createLessonUseCaseV3")
@RequiredArgsConstructor
@Slf4j
public class CreateLessonUseCaseV3 {

    private final LessonRepositoryPort lessonRepository;
    private final CourseDraftMutationUseCase courseDraftMutationUseCase;

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

        courseDraftMutationUseCase.requireEditableCourseByChapter(command.chapterId());

        UUID lessonId = lessonRepository.save(
            command.chapterId(),
            command.title(),
            command.description(),
            command.type(),
            command.videoUrl(),
            command.durationMinutes(),
            command.orderIndex(),
            command.isFree()
        );
        courseDraftMutationUseCase.markCourseChangedByChapter(command.chapterId());

        log.info("Lesson created successfully with ID: {}", lessonId);
        return lessonId;
    }
}

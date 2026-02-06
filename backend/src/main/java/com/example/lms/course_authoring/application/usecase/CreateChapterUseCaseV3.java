package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.domain.repository.ChapterRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Use case for creating a chapter in a course.
 * V3 - Uses domain repository port only.
 */
@Service("createChapterUseCaseV3")
@RequiredArgsConstructor
public class CreateChapterUseCaseV3 {

    private static final Logger log = LoggerFactory.getLogger(CreateChapterUseCaseV3.class);

    private final ChapterRepositoryPort chapterRepository;

    public record CreateChapterCommand(
        UUID courseId,
        String title,
        String description,
        Integer orderIndex
    ) {}

    @Transactional
    public UUID execute(CreateChapterCommand command) {
        log.info("Creating chapter {} for course {} (V3)", command.title(), command.courseId());

        UUID chapterId = chapterRepository.save(
            command.courseId(),
            command.title(),
            command.description(),
            command.orderIndex()
        );

        log.info("Chapter {} created with ID {} (V3)", command.title(), chapterId);
        return chapterId;
    }
}

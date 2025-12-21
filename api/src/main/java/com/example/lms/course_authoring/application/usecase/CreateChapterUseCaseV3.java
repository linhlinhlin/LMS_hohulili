package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.infrastructure.persistence.entity.ChapterJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.mapper.ChapterEntityMapper;
import com.example.lms.course_authoring.infrastructure.persistence.repository.ChapterJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Use case for creating a chapter in a course.
 * V3 - Uses pure domain models only.
 */
@Service("createChapterUseCaseV3")
@RequiredArgsConstructor
@Slf4j
public class CreateChapterUseCaseV3 {

    private final ChapterJpaRepository chapterRepository;
    private final ChapterEntityMapper mapper;

    public record CreateChapterCommand(
        UUID courseId,
        String title,
        String description,
        Integer orderIndex
    ) {}

    @Transactional
    public UUID execute(CreateChapterCommand command) {
        log.info("Creating chapter {} for course {} (V3)", command.title(), command.courseId());

        ChapterJpaEntity entity = mapper.toEntity(
            command.courseId(),
            command.title(),
            command.description(),
            command.orderIndex()
        );

        ChapterJpaEntity saved = chapterRepository.save(entity);
        
        log.info("Chapter {} created with ID {} (V3)", command.title(), saved.getId());
        return saved.getId();
    }
}

package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.ChapterRepositoryPort;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Use case for creating a chapter in a course.
 * V3 - Uses domain repository port only. Includes ownership verification.
 */
@Service("createChapterUseCaseV3")
@RequiredArgsConstructor
public class CreateChapterUseCaseV3 {

    private static final Logger log = LoggerFactory.getLogger(CreateChapterUseCaseV3.class);

    private final ChapterRepositoryPort chapterRepository;
    private final CourseRepository courseRepository;
    private final CourseDraftMutationService courseDraftMutationService;

    public record CreateChapterCommand(
        UUID courseId,
        String title,
        String description,
        Integer orderIndex,
        UUID userId,
        boolean isAdmin
    ) {}

    @Transactional
    public UUID execute(CreateChapterCommand command) {
        log.info("Creating chapter {} for course {} (V3)", command.title(), command.courseId());

        // Ownership verification: only course owner or admin can add chapters
        if (!command.isAdmin()) {
            Course course = courseRepository.findById(command.courseId())
                    .orElseThrow(() -> new EntityNotFoundException("Khóa học", command.courseId()));
            if (!course.getTeacherId().equals(command.userId())) {
                throw new BusinessRuleException("FORBIDDEN",
                        "Bạn không có quyền thêm chương vào khóa học này");
            }
        }

        courseDraftMutationService.requireEditableCourse(command.courseId());

        UUID chapterId = chapterRepository.save(
            command.courseId(),
            command.title(),
            command.description(),
            command.orderIndex()
        );
        courseDraftMutationService.markCourseChanged(command.courseId());

        log.info("Chapter {} created with ID {} (V3)", command.title(), chapterId);
        return chapterId;
    }
}

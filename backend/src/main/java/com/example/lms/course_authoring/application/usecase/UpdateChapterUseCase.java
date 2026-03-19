package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.application.dto.ChapterResponse;
import com.example.lms.course_authoring.application.dto.UpdateChapterCommand;
import com.example.lms.course_authoring.application.port.CourseStructureCommandPort;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Use case for updating a chapter.
 */
@Service
@RequiredArgsConstructor
public class UpdateChapterUseCase {

    private final CourseRepository courseRepository;
    private final CourseStructureCommandPort courseStructureCommandPort;
    private final CourseDraftMutationUseCase courseDraftMutationUseCase;

    @Transactional
    public ChapterResponse execute(UpdateChapterCommand command) {
        Course course = courseRepository.findById(command.courseId())
                .orElseThrow(() -> new EntityNotFoundException("KhÃ³a há»c", command.courseId()));

        if (!course.isOwnedBy(command.userId()) && !command.isAdmin()) {
            throw new UnauthorizedException("chá»‰nh sá»­a chÆ°Æ¡ng trong", "khÃ³a há»c nÃ y");
        }

        courseDraftMutationUseCase.requireEditableCourse(command.courseId());

        var savedChapter = courseStructureCommandPort.updateChapter(
                command.courseId(),
                command.chapterId(),
                command.title(),
                command.description()
        );
        courseDraftMutationUseCase.markCourseChanged(command.courseId());
        return new ChapterResponse(
                savedChapter.id(),
                savedChapter.title(),
                savedChapter.description(),
                savedChapter.orderIndex(),
                0,
                null,
                savedChapter.createdAt(),
                savedChapter.updatedAt()
        );
    }
}

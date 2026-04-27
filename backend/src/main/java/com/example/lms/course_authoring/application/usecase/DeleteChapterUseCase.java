package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.application.port.CourseStructureCommandPort;
import com.example.lms.course_authoring.application.service.LessonCleanupService;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Use case for deleting a chapter from a course.
 */
@Service
@RequiredArgsConstructor
public class DeleteChapterUseCase {

    private final CourseRepository courseRepository;
    private final CourseStructureCommandPort courseStructureCommandPort;
    private final LessonCleanupService lessonCleanupService;
    private final CourseDraftMutationUseCase courseDraftMutationUseCase;

    @Transactional
    public void execute(UUID courseId, UUID chapterId, UUID userId, boolean isAdmin) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", courseId));

        if (!course.isOwnedBy(userId) && !isAdmin) {
            throw new UnauthorizedException("xóa chương trong", "khóa học này");
        }

        courseDraftMutationUseCase.requireEditableCourse(courseId);

        for (UUID lessonId : courseStructureCommandPort.listLessonIds(courseId, chapterId)) {
            lessonCleanupService.cleanupBeforeDelete(lessonId);
        }
        courseStructureCommandPort.deleteChapter(courseId, chapterId);
        courseDraftMutationUseCase.markCourseChanged(courseId);
    }
}

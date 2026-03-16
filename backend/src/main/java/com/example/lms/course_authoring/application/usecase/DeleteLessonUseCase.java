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
 * Use case for deleting a lesson from a chapter.
 */
@Service
@RequiredArgsConstructor
public class DeleteLessonUseCase {

    private final CourseRepository courseRepository;
    private final CourseStructureCommandPort courseStructureCommandPort;
    private final LessonCleanupService lessonCleanupService;
    private final CourseDraftMutationService courseDraftMutationService;

    @Transactional
    public void execute(UUID courseId, UUID chapterId, UUID lessonId, UUID userId, boolean isAdmin) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("KhÃ³a há»c", courseId));

        if (!course.isOwnedBy(userId) && !isAdmin) {
            throw new UnauthorizedException("xÃ³a bÃ i há»c trong", "khÃ³a há»c nÃ y");
        }

        courseDraftMutationService.requireEditableCourse(courseId);

        lessonCleanupService.cleanupBeforeDelete(lessonId);
        courseStructureCommandPort.deleteLesson(courseId, chapterId, lessonId);
        courseDraftMutationService.markCourseChanged(courseId);
    }
}

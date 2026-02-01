package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.domain.model.Chapter;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.course_authoring.application.service.LessonCleanupService;
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
    private final LessonCleanupService lessonCleanupService;

    @Transactional
    public void execute(UUID courseId, UUID chapterId, UUID lessonId, UUID userId, boolean isAdmin) {
        // Find course with content
        Course course = courseRepository.findByIdWithContent(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", courseId));

        // Check ownership
        if (!course.isOwnedBy(userId) && !isAdmin) {
            throw new UnauthorizedException("xóa bài học trong", "khóa học này");
        }

        // Find lesson (either by chapterId + lessonId, or scan all chapters if chapterId is null)
        Chapter foundChapter = null;
        
        if (chapterId != null) {
            // Fast path: chapterId is provided
            foundChapter = course.getChapters().stream()
                    .filter(c -> c.getId().equals(chapterId))
                    .findFirst()
                    .orElseThrow(() -> new EntityNotFoundException("Chương", chapterId));
            
            boolean lessonExists = foundChapter.getLessons().stream()
                    .anyMatch(l -> l.getId().equals(lessonId));
            if (!lessonExists) {
                throw new EntityNotFoundException("Bài học", lessonId);
            }
        } else {
            // Slow path: scan all chapters to find lesson
            for (Chapter ch : course.getChapters()) {
                boolean lessonExists = ch.getLessons().stream()
                        .anyMatch(l -> l.getId().equals(lessonId));
                if (lessonExists) {
                    foundChapter = ch;
                    break;
                }
            }
            if (foundChapter == null) {
                throw new EntityNotFoundException("Bài học", lessonId);
            }
        }

        // IMPORTANT: Clean up related records BEFORE removing lesson
        // This prevents FK constraint violations from quizzes, progress, attachments, etc.
        lessonCleanupService.cleanupBeforeDelete(lessonId);

        // Remove lesson (JPA will cascade delete sections via orphanRemoval)
        foundChapter.removeLesson(lessonId);

        // Save course
        courseRepository.save(course);
    }
}

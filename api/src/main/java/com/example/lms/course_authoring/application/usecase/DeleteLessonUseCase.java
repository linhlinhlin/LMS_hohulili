package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.domain.model.Chapter;
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

    @Transactional
    public void execute(UUID courseId, UUID chapterId, UUID lessonId, UUID userId) {
        // Find course with content
        Course course = courseRepository.findByIdWithContent(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", courseId));

        // Check ownership
        if (!course.isOwnedBy(userId)) {
            throw new UnauthorizedException("xóa bài học trong", "khóa học này");
        }

        // Find chapter
        Chapter chapter = course.getChapters().stream()
                .filter(c -> c.getId().equals(chapterId))
                .findFirst()
                .orElseThrow(() -> new EntityNotFoundException("Chương", chapterId));

        // Verify lesson exists
        boolean lessonExists = chapter.getLessons().stream()
                .anyMatch(l -> l.getId().equals(lessonId));
        if (!lessonExists) {
            throw new EntityNotFoundException("Bài học", lessonId);
        }

        // Remove lesson
        chapter.removeLesson(lessonId);

        // Save course
        courseRepository.save(course);
    }
}

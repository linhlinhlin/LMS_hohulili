package com.example.lms.course_authoring.application.usecase;

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

    @Transactional
    public void execute(UUID courseId, UUID chapterId, UUID userId) {
        // Find course
        Course course = courseRepository.findByIdWithContent(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", courseId));

        // Check ownership
        if (!course.isOwnedBy(userId)) {
            throw new UnauthorizedException("xóa chương trong", "khóa học này");
        }

        // Verify chapter exists
        boolean chapterExists = course.getChapters().stream()
                .anyMatch(c -> c.getId().equals(chapterId));
        if (!chapterExists) {
            throw new EntityNotFoundException("Chương", chapterId);
        }

        // Remove chapter (domain logic handles reordering)
        course.removeChapter(chapterId);

        // Save course
        courseRepository.save(course);
    }
}

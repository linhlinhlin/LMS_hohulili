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
 * Use case for deleting a course.
 */
@Service
@RequiredArgsConstructor
public class DeleteCourseUseCase {

    private final CourseRepository courseRepository;

    @Transactional
    public void execute(UUID courseId, UUID userId) {
        execute(courseId, userId, false);
    }

    @Transactional
    public void execute(UUID courseId, UUID userId, boolean isAdmin) {
        // Find course
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", courseId));

        // Check ownership (admin bypasses)
        if (!isAdmin && !course.isOwnedBy(userId)) {
            throw new UnauthorizedException("xóa", "khóa học này");
        }

        // Delete course
        courseRepository.delete(course);
    }
}

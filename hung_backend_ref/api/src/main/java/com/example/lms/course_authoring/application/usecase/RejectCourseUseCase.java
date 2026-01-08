package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.application.dto.CourseResponse;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Use case for rejecting a course (admin only).
 */
@Service
@RequiredArgsConstructor
public class RejectCourseUseCase {

    private final CourseRepository courseRepository;

    @Transactional
    public CourseResponse execute(UUID courseId, UUID reviewerId, String reason) {
        // Find course
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", courseId));

        // Reject course (domain logic handles validation)
        course.reject(reviewerId, reason);

        // Save course
        course = courseRepository.save(course);

        return CourseResponse.from(course);
    }
}

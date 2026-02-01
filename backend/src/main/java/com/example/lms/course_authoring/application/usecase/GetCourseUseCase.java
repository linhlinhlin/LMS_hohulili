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
 * Use case for retrieving a course by ID.
 */
@Service
@RequiredArgsConstructor
public class GetCourseUseCase {

    private final CourseRepository courseRepository;

    @Transactional(readOnly = true)
    public CourseResponse execute(UUID courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", courseId));

        return CourseResponse.from(course);
    }

    /**
     * Get course with full content (chapters and lessons).
     */
    @Transactional(readOnly = true)
    public CourseResponse executeWithContent(UUID courseId) {
        Course course = courseRepository.findByIdWithContent(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", courseId));

        return CourseResponse.from(course);
    }

    /**
     * Get course for public access (only approved courses).
     */
    @Transactional(readOnly = true)
    public CourseResponse executePublic(UUID courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", courseId));

        if (!course.isPublished()) {
            throw new EntityNotFoundException("Khóa học", courseId);
        }

        return CourseResponse.from(course);
    }
}

package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.application.dto.CourseSummaryResponse;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Use case for listing courses with various filters.
 */
@Service
@RequiredArgsConstructor
public class ListCoursesUseCase {

    private final CourseRepository courseRepository;

    /**
     * List courses by teacher.
     */
    @Transactional(readOnly = true)
    public Page<CourseSummaryResponse> executeByTeacher(UUID teacherId, Pageable pageable) {
        Page<Course> courses = courseRepository.findByTeacherId(teacherId, pageable);
        return courses.map(CourseSummaryResponse::from);
    }

    /**
     * List approved (public) courses.
     */
    @Transactional(readOnly = true)
    public Page<CourseSummaryResponse> executeApproved(Pageable pageable) {
        Page<Course> courses = courseRepository.findApproved(pageable);
        return courses.map(CourseSummaryResponse::from);
    }

    /**
     * List approved courses with search.
     */
    @Transactional(readOnly = true)
    public Page<CourseSummaryResponse> executeApprovedWithSearch(String search, Pageable pageable) {
        Page<Course> courses;
        if (search != null && !search.isBlank()) {
            courses = courseRepository.findApprovedByTitleContaining(search.trim(), pageable);
        } else {
            courses = courseRepository.findApproved(pageable);
        }
        return courses.map(CourseSummaryResponse::from);
    }

    /**
     * List pending courses (for admin review).
     */
    @Transactional(readOnly = true)
    public Page<CourseSummaryResponse> executePending(Pageable pageable) {
        Page<Course> courses = courseRepository.findPending(pageable);
        return courses.map(CourseSummaryResponse::from);
    }
}

package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.application.dto.CourseResponse;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Use case for submitting a course for approval.
 */
@Service
@RequiredArgsConstructor
public class SubmitCourseForApprovalUseCase {

    private final CourseRepository courseRepository;

    @Transactional
    public CourseResponse execute(UUID courseId, UUID userId) {
        // Find course
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", courseId));

        // Check ownership
        if (!course.isOwnedBy(userId)) {
            throw new UnauthorizedException("gửi duyệt", "khóa học này");
        }

        // Submit for approval (domain logic handles validation)
        course.submitForApproval();

        // Save course
        course = courseRepository.save(course);

        return CourseResponse.from(course);
    }
}

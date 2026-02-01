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
 * Use case for canceling a course approval request.
 */
@Service
@RequiredArgsConstructor
public class CancelApprovalRequestUseCase {

    private final CourseRepository courseRepository;

    @Transactional
    public CourseResponse execute(UUID courseId, UUID userId) {
        // Find course
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", courseId));

        // Check ownership
        if (!course.isOwnedBy(userId)) {
            throw new UnauthorizedException("hủy yêu cầu duyệt", "khóa học này");
        }

        // Cancel approval request (domain logic handles validation)
        course.cancelApprovalRequest();

        // Save course
        course = courseRepository.save(course);

        return CourseResponse.from(course);
    }
}

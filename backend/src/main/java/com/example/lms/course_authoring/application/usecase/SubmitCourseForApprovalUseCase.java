package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.application.dto.CourseResponse;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.ChapterRepositoryPort;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.shared.exception.BusinessRuleException;
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
    private final ChapterRepositoryPort chapterRepository;

    @Transactional
    public CourseResponse execute(UUID courseId, UUID userId) {
        // Find course
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", courseId));

        // Check ownership
        if (!course.isOwnedBy(userId)) {
            throw new UnauthorizedException("gửi duyệt", "khóa học này");
        }

        // Cross-aggregate validation: chapters exist in separate aggregate
        long chapterCount = chapterRepository.countByCourseId(courseId);
        if (chapterCount == 0) {
            throw new BusinessRuleException("NO_CHAPTERS",
                "Khóa học phải có ít nhất 1 chương trước khi gửi duyệt");
        }

        // Submit for approval (domain logic handles status transition)
        course.submitForApproval();

        // Save course
        course = courseRepository.save(course);

        return CourseResponse.from(course);
    }
}

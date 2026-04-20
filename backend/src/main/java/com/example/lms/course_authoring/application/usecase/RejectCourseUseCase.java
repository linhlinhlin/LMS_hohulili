package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.application.dto.CourseResponse;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.model.CourseRejectionCategory;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseReviewEventJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CourseReviewEventJpaRepository;
import com.example.lms.shared.domain.event.DomainEventPublisher;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Use case for rejecting a course (admin only).
 * Supports structured rejection category (Phase 3) alongside free-text reason.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RejectCourseUseCase {

    private final CourseRepository courseRepository;
    private final DomainEventPublisher eventPublisher;
    private final CourseReviewEventJpaRepository reviewEventRepository;

    /**
     * Legacy overload — delegates to the structured variant with OTHER category.
     */
    @Transactional
    public CourseResponse execute(UUID courseId, UUID reviewerId, String reason) {
        return execute(courseId, reviewerId, reason, null);
    }

    @Transactional
    public CourseResponse execute(UUID courseId, UUID reviewerId, String reason,
                                   CourseRejectionCategory category) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", courseId));

        course.reject(reviewerId, reason, category);
        course = courseRepository.save(course);

        // Record audit event — capture category alongside free-text comment
        reviewEventRepository.save(CourseReviewEventJpaEntity.builder()
                .courseId(courseId)
                .reviewerId(reviewerId)
                .action("REJECTED")
                .comment(reason)
                .rejectionCategory(category != null ? category.name() : null)
                .build());

        course.getDomainEvents().forEach(eventPublisher::publish);
        course.clearDomainEvents();

        log.info("Course rejected: {} by reviewer {} (category={})",
                course.getCode().getValue(), reviewerId,
                category != null ? category.name() : "OTHER");

        return CourseResponse.from(course);
    }
}

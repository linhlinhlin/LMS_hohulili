package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.application.dto.CourseResponse;
import com.example.lms.course_authoring.domain.model.Course;
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
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RejectCourseUseCase {

    private final CourseRepository courseRepository;
    private final DomainEventPublisher eventPublisher;
    private final CourseReviewEventJpaRepository reviewEventRepository;

    @Transactional
    public CourseResponse execute(UUID courseId, UUID reviewerId, String reason) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", courseId));

        course.reject(reviewerId, reason);
        course = courseRepository.save(course);

        // Record audit event
        reviewEventRepository.save(CourseReviewEventJpaEntity.builder()
                .courseId(courseId)
                .reviewerId(reviewerId)
                .action("REJECTED")
                .comment(reason)
                .build());

        course.getDomainEvents().forEach(eventPublisher::publish);
        course.clearDomainEvents();

        log.info("Course rejected: {} by reviewer {}", course.getCode().getValue(), reviewerId);

        return CourseResponse.from(course);
    }
}

package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.application.dto.CourseResponse;
import com.example.lms.course_authoring.application.port.CoursePublicationPort;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseReviewEventJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CourseReviewEventJpaRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.domain.event.DomainEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Use case for approving a course (admin only).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ApproveCourseUseCase {

    private final CourseRepository courseRepository;
    private final DomainEventPublisher eventPublisher;
    private final CoursePublicationPort coursePublicationPort;
    private final CourseReviewEventJpaRepository reviewEventRepository;

    @Transactional
    public CourseResponse execute(UUID courseId, UUID reviewerId, String comment) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", courseId));

        // Get release notes before approve clears them
        String releaseNotes = course.getPendingReleaseNotes();

        course.approve(reviewerId, comment);

        // Clear pending release notes after approval
        course.setPendingReleaseNotes(null);

        course = courseRepository.save(course);

        // Publish with release notes
        coursePublicationPort.publish(course.getId(), reviewerId, releaseNotes);

        // Record audit event
        reviewEventRepository.save(CourseReviewEventJpaEntity.builder()
                .courseId(courseId)
                .reviewerId(reviewerId)
                .action("APPROVED")
                .comment(comment)
                .build());

        course.getDomainEvents().forEach(eventPublisher::publish);
        course.clearDomainEvents();

        log.info("Course approved: {} by reviewer {}", course.getCode().getValue(), reviewerId);

        return CourseResponse.from(course);
    }
}

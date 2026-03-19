package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.application.dto.CourseResponse;
import com.example.lms.course_authoring.application.port.CoursePublicationPort;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
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

    @Transactional
    public CourseResponse execute(UUID courseId, UUID reviewerId, String comment) {
        // Find course
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", courseId));

        // Approve course (domain logic handles validation)
        course.approve(reviewerId, comment);

        // Save course
        course = courseRepository.save(course);

        coursePublicationPort.publish(course.getId(), reviewerId);

        // Publish domain events (CourseApprovedEvent will be received by Learning Delivery)
        course.getDomainEvents().forEach(eventPublisher::publish);
        course.clearDomainEvents();

        log.info("Course approved: {} by reviewer {}", course.getCode().getValue(), reviewerId);

        return CourseResponse.from(course);
    }
}

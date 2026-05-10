package com.example.lms.shared.integration;

import com.example.lms.assessment.domain.event.AssignmentSubmittedEvent;
import com.example.lms.assessment.domain.event.QuizSubmittedEvent;
import com.example.lms.assessment.domain.event.SubmissionGradedEvent;
import com.example.lms.learning_delivery.domain.event.CourseEnrolledEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Anti-corruption bridge: LMS domain events to Wiii AI webhooks.
 */
@Component
public class WiiiEventBridge {

    private static final Logger log = LoggerFactory.getLogger(WiiiEventBridge.class);

    private final WiiiLmsEventPublisher wiiiLmsEventPublisher;

    public WiiiEventBridge(WiiiLmsEventPublisher wiiiLmsEventPublisher) {
        this.wiiiLmsEventPublisher = wiiiLmsEventPublisher;
    }

    @EventListener
    public void onCourseEnrolled(CourseEnrolledEvent event) {
        log.debug("Course enrolled event received for Wiii forwarding: {}", event.getEventId());
        wiiiLmsEventPublisher.sendCourseEnrolled(event);
    }

    @EventListener
    public void onAssignmentSubmitted(AssignmentSubmittedEvent event) {
        log.debug("Assignment submitted event received for Wiii forwarding: {}", event.getEventId());
        wiiiLmsEventPublisher.sendAssignmentSubmitted(event);
    }

    @EventListener
    public void onQuizSubmitted(QuizSubmittedEvent event) {
        log.debug("Quiz submitted event received for Wiii forwarding: {}", event.getEventId());
        wiiiLmsEventPublisher.sendQuizCompleted(event);
    }

    @EventListener
    public void onSubmissionGraded(SubmissionGradedEvent event) {
        log.debug("Submission graded event received for Wiii forwarding: {}", event.getEventId());
        wiiiLmsEventPublisher.sendSubmissionGraded(event);
    }
}

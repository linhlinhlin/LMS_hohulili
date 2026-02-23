package com.example.lms.shared.integration;

import com.example.lms.shared.domain.event.DomainEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Anti-corruption bridge: LMS domain events → Wiii AI webhooks.
 *
 * <p>Listens for Spring ApplicationEvents (published by SpringEventPublisher)
 * and forwards them to Wiii as webhook events. Each domain event type is
 * mapped to a Wiii webhook event type:
 *
 * <ul>
 *   <li>QuizSubmittedEvent → quiz_completed + grade_saved
 *   <li>StudentEnrolledEvent → course_enrolled
 *   <li>AssignmentSubmittedEvent → assignment_submitted
 * </ul>
 *
 * <p>Wiii event format matches LMSWebhookEventType enum in
 * {@code app/integrations/lms/models.py}.
 */
@Component
public class WiiiEventBridge {

    private static final Logger log = LoggerFactory.getLogger(WiiiEventBridge.class);

    private final WiiiWebhookEmitter webhookEmitter;
    private final WiiiIntegrationConfig config;

    public WiiiEventBridge(WiiiWebhookEmitter webhookEmitter, WiiiIntegrationConfig config) {
        this.webhookEmitter = webhookEmitter;
        this.config = config;
    }

    /**
     * Catch-all listener for DomainEvent.
     * Routes to specific handlers based on event type.
     */
    @EventListener
    public void onDomainEvent(DomainEvent event) {
        if (!config.getWebhook().isEnabled()) {
            return;
        }

        String eventType = event.getEventType();
        log.debug("Domain event received for Wiii forwarding: {}", eventType);

        switch (eventType) {
            case "QuizSubmittedEvent" -> handleQuizSubmitted(event);
            case "StudentEnrolledEvent" -> handleStudentEnrolled(event);
            case "AssignmentSubmittedEvent" -> handleAssignmentSubmitted(event);
            default -> log.trace("Ignoring event type for Wiii: {}", eventType);
        }
    }

    /**
     * QuizSubmittedEvent → quiz_completed webhook.
     *
     * <p>Expected event properties (accessed via reflection or casting):
     * quizId, studentId, courseId, score, passed
     */
    private void handleQuizSubmitted(DomainEvent event) {
        try {
            // QuizSubmittedEvent fields (from assessment domain)
            var quizEvent = (com.example.lms.assessment.domain.event.QuizSubmittedEvent) event;

            Map<String, Object> payload = new HashMap<>();
            String studentId = quizEvent.getStudentId().value().toString();
            String courseId = quizEvent.getCourseId() != null
                    ? quizEvent.getCourseId().value().toString() : "";

            payload.put("student_id", studentId);
            payload.put("quiz_id", quizEvent.getQuizId().toString());
            payload.put("course_id", courseId);
            payload.put("score", quizEvent.getScore());
            payload.put("max_score", 100.0);  // QuizAttempt normalizes to 0-100
            payload.put("quiz_name", "");  // Not in event, enriched by Wiii

            webhookEmitter.sendEvent("quiz_completed", payload);

            // Also send as grade_saved (quiz score is a grade)
            Map<String, Object> gradePayload = new HashMap<>();
            gradePayload.put("student_id", studentId);
            gradePayload.put("course_id", courseId);
            gradePayload.put("grade", quizEvent.getScore());
            gradePayload.put("max_grade", 100.0);
            gradePayload.put("assignment_name", "Quiz");

            webhookEmitter.sendEvent("grade_saved", gradePayload);

            log.info("Forwarded QuizSubmittedEvent to Wiii: student={}", quizEvent.getStudentId());
        } catch (Exception e) {
            log.warn("Failed to forward QuizSubmittedEvent: {}", e.getMessage());
        }
    }

    /**
     * StudentEnrolledEvent → course_enrolled webhook.
     *
     * <p>Since we don't have a specific StudentEnrolledEvent domain event class yet,
     * this handler is prepared for when it's added. Meanwhile, enrollment webhooks
     * can be triggered directly from EnrollStudentUseCaseV3.
     */
    private void handleStudentEnrolled(DomainEvent event) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("student_id", event.getAggregateId().toString());
            // Additional fields will be populated when StudentEnrolledEvent is created

            webhookEmitter.sendEvent("course_enrolled", payload);
            log.info("Forwarded StudentEnrolledEvent to Wiii: aggregate={}", event.getAggregateId());
        } catch (Exception e) {
            log.warn("Failed to forward StudentEnrolledEvent: {}", e.getMessage());
        }
    }

    /**
     * AssignmentSubmittedEvent → assignment_submitted webhook.
     */
    private void handleAssignmentSubmitted(DomainEvent event) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("student_id", event.getAggregateId().toString());
            payload.put("assignment_id", event.getAggregateId().toString());
            payload.put("submitted_at", event.getOccurredAt().toString());

            webhookEmitter.sendEvent("assignment_submitted", payload);
            log.info("Forwarded AssignmentSubmittedEvent to Wiii: aggregate={}", event.getAggregateId());
        } catch (Exception e) {
            log.warn("Failed to forward AssignmentSubmittedEvent: {}", e.getMessage());
        }
    }
}

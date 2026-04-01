package com.example.lms.assessment.domain.event;

import com.example.lms.shared.domain.event.AbstractDomainEvent;
import lombok.Getter;

import java.util.UUID;

/**
 * Domain event published when a submission is graded or feedback is added.
 * Consumed by GradingAuditLogHandler to persist immutable audit trail (STCW compliance).
 */
@Getter
public class SubmissionGradedEvent extends AbstractDomainEvent {

    private final UUID submissionId;
    private final UUID assignmentId;
    private final UUID studentId;
    private final UUID graderId;
    private final String graderName;
    private final String eventAction; // GRADE_CREATED, GRADE_UPDATED, FEEDBACK_ADDED
    private final Double oldGrade;
    private final Double newGrade;
    private final String oldFeedback;
    private final String newFeedback;

    public SubmissionGradedEvent(UUID submissionId, UUID assignmentId, UUID studentId,
                                  UUID graderId, String graderName, String eventAction,
                                  Double oldGrade, Double newGrade,
                                  String oldFeedback, String newFeedback) {
        super(submissionId);
        this.submissionId = submissionId;
        this.assignmentId = assignmentId;
        this.studentId = studentId;
        this.graderId = graderId;
        this.graderName = graderName;
        this.eventAction = eventAction;
        this.oldGrade = oldGrade;
        this.newGrade = newGrade;
        this.oldFeedback = oldFeedback;
        this.newFeedback = newFeedback;
    }
}

package com.example.lms.assessment.domain.event;

import com.example.lms.shared.domain.event.AbstractDomainEvent;

import java.time.Instant;
import java.util.UUID;

/**
 * Domain event raised after a student submits or resubmits an assignment.
 */
public class AssignmentSubmittedEvent extends AbstractDomainEvent {

    private final UUID submissionId;
    private final UUID assignmentId;
    private final UUID studentId;
    private final Instant submittedAt;

    public AssignmentSubmittedEvent(UUID submissionId, UUID assignmentId, UUID studentId, Instant submittedAt) {
        super(submissionId);
        this.submissionId = submissionId;
        this.assignmentId = assignmentId;
        this.studentId = studentId;
        this.submittedAt = submittedAt;
    }

    public UUID getSubmissionId() {
        return submissionId;
    }

    public UUID getAssignmentId() {
        return assignmentId;
    }

    public UUID getStudentId() {
        return studentId;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }
}

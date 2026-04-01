package com.example.lms.assessment.application.eventhandler;

import com.example.lms.assessment.domain.event.SubmissionGradedEvent;
import com.example.lms.assessment.infrastructure.persistence.entity.GradingAuditLogJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.GradingAuditLogJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Persists grading events into grading_audit_log for STCW compliance.
 * Uses REQUIRES_NEW propagation so audit persists even if caller rolls back.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GradingAuditLogHandler {

    private final GradingAuditLogJpaRepository repository;

    @EventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handle(SubmissionGradedEvent event) {
        var entry = GradingAuditLogJpaEntity.builder()
                .assignmentId(event.getAssignmentId())
                .submissionId(event.getSubmissionId())
                .studentId(event.getStudentId())
                .eventType(event.getEventAction())
                .gradedBy(event.getGraderId())
                .gradedByName(event.getGraderName())
                .oldGrade(event.getOldGrade())
                .newGrade(event.getNewGrade())
                .oldFeedback(event.getOldFeedback())
                .newFeedback(event.getNewFeedback())
                .occurredAt(event.getOccurredAt())
                .build();

        repository.save(entry);
        log.debug("Grading audit logged: {} submission={} by={}",
                event.getEventAction(), event.getSubmissionId(), event.getGraderName());
    }
}

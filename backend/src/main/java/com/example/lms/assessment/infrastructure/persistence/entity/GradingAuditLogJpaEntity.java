package com.example.lms.assessment.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "grading_audit_log")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GradingAuditLogJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "assignment_id", nullable = false)
    private UUID assignmentId;

    @Column(name = "submission_id", nullable = false)
    private UUID submissionId;

    @Column(name = "student_id", nullable = false)
    private UUID studentId;

    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType;

    @Column(name = "graded_by", nullable = false)
    private UUID gradedBy;

    @Column(name = "graded_by_name")
    private String gradedByName;

    @Column(name = "old_grade")
    private Double oldGrade;

    @Column(name = "new_grade")
    private Double newGrade;

    @Column(name = "old_feedback", columnDefinition = "TEXT")
    private String oldFeedback;

    @Column(name = "new_feedback", columnDefinition = "TEXT")
    private String newFeedback;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}

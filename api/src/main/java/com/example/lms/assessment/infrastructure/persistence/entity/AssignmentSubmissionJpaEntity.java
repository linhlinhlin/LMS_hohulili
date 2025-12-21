package com.example.lms.assessment.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * JPA Entity for AssignmentSubmission persistence.
 */
@Entity
@Table(name = "assignment_submissions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentSubmissionJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "assignment_id", nullable = false)
    private UUID assignmentId;

    @Column(name = "student_id", nullable = false)
    private UUID studentId;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "file_url", length = 500)
    private String fileUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SubmissionStatus status = SubmissionStatus.SUBMITTED;

    @Column
    private Double score;

    @Column(columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "graded_by_id")
    private UUID gradedById;

    @Column(name = "graded_at")
    private Instant gradedAt;

    @CreationTimestamp
    @Column(name = "submitted_at", nullable = false, updatable = false)
    private Instant submittedAt;

    @Column(name = "attempt_number")
    @Builder.Default
    private Integer attemptNumber = 1;

    public enum SubmissionStatus {
        DRAFT, SUBMITTED, GRADING, GRADED, RETURNED
    }
}

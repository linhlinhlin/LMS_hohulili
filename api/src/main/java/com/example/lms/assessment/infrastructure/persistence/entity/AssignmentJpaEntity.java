package com.example.lms.assessment.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * JPA Entity for Assignment persistence.
 */
@Entity
@Table(name = "assignments")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "lesson_id")
    private UUID lessonId;

    @Column(name = "course_id")
    private UUID courseId;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String instructions;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AssignmentType type = AssignmentType.FILE_UPLOAD;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AssignmentStatus status = AssignmentStatus.DRAFT;

    @Column(name = "max_score")
    @Builder.Default
    private Integer maxScore = 100;

    @Column(name = "passing_score")
    @Builder.Default
    private Integer passingScore = 60;

    @Column(name = "due_date")
    private Instant dueDate;

    @Column(name = "max_attempts")
    @Builder.Default
    private Integer maxAttempts = 1;

    @Column(name = "allow_late_submission")
    @Builder.Default
    private Boolean allowLateSubmission = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public enum AssignmentType {
        FILE_UPLOAD, TEXT, QUIZ, PROJECT, ESSAY
    }

    public enum AssignmentStatus {
        DRAFT, PUBLISHED, CLOSED, ARCHIVED
    }
}

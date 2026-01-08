package com.example.lms.learning_delivery.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * JPA Entity for StudentLessonProgress persistence.
 */
@Entity
@Table(name = "student_lesson_progress")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentLessonProgressJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "student_id", nullable = false)
    private UUID studentId;

    @Column(name = "lesson_id", nullable = false)
    private UUID lessonId;

    @Column(name = "enrollment_id")
    private UUID enrollmentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ProgressStatus status = ProgressStatus.NOT_STARTED;

    @Column(name = "watch_time_seconds")
    @Builder.Default
    private Integer watchTimeSeconds = 0;

    @Column(name = "completion_percent")
    @Builder.Default
    private Integer completionPercent = 0;

    @Column(name = "completed_at")
    private Instant completedAt;

    @CreationTimestamp
    @Column(name = "started_at", updatable = false)
    private Instant startedAt;

    @UpdateTimestamp
    @Column(name = "last_accessed_at")
    private Instant lastAccessedAt;

    public enum ProgressStatus {
        NOT_STARTED, IN_PROGRESS, COMPLETED
    }
}

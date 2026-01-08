package com.example.lms.learning_delivery.domain.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * LearningClass aggregate root.
 * 
 * Following DDD principles:
 * - References to other aggregates (Course, User) are by ID only
 * - This maintains bounded context isolation
 */
@Entity
@Table(name = "learning_classes")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class LearningClass {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotBlank
    @Column(nullable = false)
    private String name;

    @Column(unique = true)
    private String code;

    @Column(name = "course_version_id")
    private UUID courseVersionId;

    /**
     * Reference to Course aggregate by ID (DDD principle: reference by ID, not entity)
     */
    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    /**
     * Reference to User aggregate (teacher) by ID
     */
    @Column(name = "teacher_id")
    private UUID teacherId;

    @Column(name = "start_date")
    private Instant startDate;

    @Column(name = "end_date")
    private Instant endDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "schedule_type")
    @Builder.Default
    private ScheduleType scheduleType = ScheduleType.CUSTOM;

    private String semester; // e.g., "HK1-2024"

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ClassStatus status = ClassStatus.OPEN;
    
    @Column(name = "max_students")
    @Builder.Default
    private Integer maxStudents = 9999;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
    
    public enum ClassStatus {
        OPEN, CLOSED, ARCHIVED, CANCELLED
    }

    public enum ScheduleType {
        SEMESTER, CUSTOM
    }
}

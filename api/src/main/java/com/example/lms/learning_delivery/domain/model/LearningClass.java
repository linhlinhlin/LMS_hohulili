package com.example.lms.learning_delivery.domain.model;

import com.example.lms.entity.Course;
import com.example.lms.entity.User;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id")
    private User teacher;

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

    @OneToMany(mappedBy = "learningClass", fetch = FetchType.LAZY)
    private java.util.List<Enrollment> enrollments;

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

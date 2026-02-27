package com.example.lms.learning_delivery.infrastructure.persistence.entity;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.*;

/**
 * JPA Entity for Enrollment persistence.
 *
 * This entity is part of the INFRASTRUCTURE layer and should NOT be used
 * directly in domain/application layers. Use the domain model instead.
 */
@Entity
@Table(name = "enrollments",
       uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "class_id"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrollmentJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id", nullable = false)
    private LearningClassJpaEntity learningClass;

    @Column(name = "student_id", nullable = false)
    private UUID studentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private EnrollmentStatus status = EnrollmentStatus.ACTIVE;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, LessonProgressData> progress = new HashMap<>();

    @Column(name = "completion_percent")
    @Builder.Default
    private Integer completionPercent = 0;

    @Column(name = "completed_at")
    private Instant completedAt;

    @CreationTimestamp
    @Column(name = "enrolled_at", updatable = false)
    private Instant enrolledAt;

    @Column(name = "joined_at")
    private Instant joinedAt;

    @UpdateTimestamp
    @Column(name = "last_accessed_at")
    private Instant lastAccessedAt;

    @Version
    @Column(name = "version")
    @Builder.Default
    private Long version = 0L;

    // Managed by DB trigger trg_enrollments_updated_at (fn_set_updated_at)
    @Column(name = "updated_at", insertable = false, updatable = false)
    private Instant updatedAt;

    public enum EnrollmentStatus {
        ACTIVE("Đang học"),
        COMPLETED("Hoàn thành"),
        DROPPED("Bỏ học"),
        EXPIRED("Hết hạn"),
        SUSPENDED("Tạm dừng");

        private final String displayName;

        EnrollmentStatus(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }

    /**
     * JSONB data structure for lesson progress.
     * Note: lastActivity is stored as ISO-8601 String to avoid Jackson/Instant serialization issues.
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LessonProgressData {
        private String status; // LOCKED, UNLOCKED, COMPLETED
        private Integer watchSeconds;
        private Double grade;
        private String lastActivity; // ISO-8601 string, avoids Jackson Instant issue in JSONB
        private List<String> completedSections;
    }
}

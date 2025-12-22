package com.example.lms.learning_delivery.domain.model;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Enrollment aggregate.
 * 
 * Following DDD principles:
 * - References to User aggregate are by ID only
 * - This maintains bounded context isolation
 */
@Entity
@Table(name = "enrollments", 
       uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "class_id"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Enrollment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id", nullable = false)
    private LearningClass learningClass;

    /**
     * Reference to User aggregate (student) by ID (DDD principle)
     */
    @Column(name = "student_id", nullable = false)
    private UUID studentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private EnrollmentStatus status = EnrollmentStatus.ACTIVE;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, LessonProgress> progress = new HashMap<>(); 
    // Key: LessonID (String), Value: Progress Detail

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

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class LessonProgress {
        private String status; // LOCKED, UNLOCKED, COMPLETED
        private Integer watchSeconds;
        private Double grade;
        private Instant lastActivity;
    }

    public enum EnrollmentStatus {
        ACTIVE, COMPLETED, DROPPED, EXPIRED
    }
    
    // Domain Logic
    
    public void updateProgress(String lessonId, LessonProgress newProgress) {
        this.progress.put(lessonId, newProgress);
    }
    
    /**
     * Convenience method to get the class ID without loading the full LearningClass entity.
     */
    public UUID getClassId() {
        return learningClass != null ? learningClass.getId() : null;
    }
}

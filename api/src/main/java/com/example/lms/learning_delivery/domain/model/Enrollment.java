package com.example.lms.learning_delivery.domain.model;

import com.example.lms.entity.User;
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

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

    @Column(name = "joined_at") // Keeping for backward compatibility if needed, or alias to enrolledAt
    private Instant joinedAt;

    @UpdateTimestamp
    @Column(name = "last_accessed_at")
    private Instant lastAccessedAt;

    // === PAYMENT FIELDS ===

    @Column(name = "is_paid")
    @Builder.Default
    private Boolean isPaid = false;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "payment_id")
    private UUID paymentId;

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
        // recalculateCompletion(); // To be implemented or called by service
    }
}

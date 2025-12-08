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
@Table(name = "learning_enrollments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Enrollment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id", nullable = false)
    private Class clazz;

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
    private Integer completionPercent = 0; // Optimized column for reporting

    @Column(name = "completed_at")
    private Instant completedAt;

    @CreationTimestamp
    @Column(name = "joined_at", updatable = false)
    private Instant joinedAt;

    @UpdateTimestamp
    @Column(name = "last_accessed_at")
    private Instant lastAccessedAt;

    // Helper POJO for JSONB
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
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
        recalculateCompletion();
    }
    
    private void recalculateCompletion() {
        // Simple calculation: count COMPLETED / Total tracked lessons
        // Note: We don't know "Total" here without the CourseVersion snapshot.
        // The Application Service should likely pass the 'totalLessons' count or logic here,
        // or we just calculate based on what we have seen? 
        // Better: Application Service calculates percent and sets it.
    }
}

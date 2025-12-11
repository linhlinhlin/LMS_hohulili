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
    private EnrollmentStatus status = EnrollmentStatus.ACTIVE;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    private Map<String, LessonProgress> progress = new HashMap<>(); 
    // Key: LessonID (String), Value: Progress Detail

    @Column(name = "completion_percent")
    private Integer completionPercent = 0; // Optimized column for reporting

    @Column(name = "completed_at")
    private Instant completedAt;

    @CreationTimestamp
    @Column(name = "joined_at", updatable = false)
    private Instant joinedAt;

    @UpdateTimestamp
    @Column(name = "last_accessed_at")
    private Instant lastAccessedAt;

    public static class LessonProgress {
        private String status; // LOCKED, UNLOCKED, COMPLETED
        private Integer watchSeconds;
        private Double grade;
        private Instant lastActivity;

        public LessonProgress() {}
        public LessonProgress(String status, Integer watchSeconds, Double grade, Instant lastActivity) {
            this.status = status;
            this.watchSeconds = watchSeconds;
            this.grade = grade;
            this.lastActivity = lastActivity;
        }

        // Getters/Setters
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public Integer getWatchSeconds() { return watchSeconds; }
        public void setWatchSeconds(Integer watchSeconds) { this.watchSeconds = watchSeconds; }
        public Double getGrade() { return grade; }
        public void setGrade(Double grade) { this.grade = grade; }
        public Instant getLastActivity() { return lastActivity; }
        public void setLastActivity(Instant lastActivity) { this.lastActivity = lastActivity; }

        public static LessonProgressBuilder builder() { return new LessonProgressBuilder(); }
        public static class LessonProgressBuilder {
            private LessonProgress p = new LessonProgress();
            public LessonProgressBuilder status(String s) { p.setStatus(s); return this; }
            public LessonProgressBuilder watchSeconds(Integer w) { p.setWatchSeconds(w); return this; }
            public LessonProgressBuilder grade(Double g) { p.setGrade(g); return this; }
            public LessonProgressBuilder lastActivity(Instant l) { p.setLastActivity(l); return this; }
            public LessonProgress build() { return p; }
        }
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
    // Manual Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Class getClazz() { return clazz; }
    public void setClazz(Class clazz) { this.clazz = clazz; }
    public User getStudent() { return student; }
    public void setStudent(User student) { this.student = student; }
    public EnrollmentStatus getStatus() { return status; }
    public void setStatus(EnrollmentStatus status) { this.status = status; }
    public Map<String, LessonProgress> getProgress() { return progress; }
    public void setProgress(Map<String, LessonProgress> progress) { this.progress = progress; }
    public Integer getCompletionPercent() { return completionPercent; }
    public void setCompletionPercent(Integer completionPercent) { this.completionPercent = completionPercent; }
    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }
    public Instant getJoinedAt() { return joinedAt; }
    public void setJoinedAt(Instant joinedAt) { this.joinedAt = joinedAt; }
    public Instant getLastAccessedAt() { return lastAccessedAt; }
    public void setLastAccessedAt(Instant lastAccessedAt) { this.lastAccessedAt = lastAccessedAt; }

    // Manual Builder
    public static EnrollmentBuilder builder() { return new EnrollmentBuilder(); }
    public static class EnrollmentBuilder {
        private Enrollment enrollment = new Enrollment();
        public EnrollmentBuilder id(UUID id) { enrollment.setId(id); return this; }
        public EnrollmentBuilder clazz(Class c) { enrollment.setClazz(c); return this; }
        public EnrollmentBuilder student(User s) { enrollment.setStudent(s); return this; }
        public EnrollmentBuilder status(EnrollmentStatus s) { enrollment.setStatus(s); return this; }
        public EnrollmentBuilder progress(Map<String, LessonProgress> p) { enrollment.setProgress(p); return this; }
        public EnrollmentBuilder completionPercent(Integer c) { enrollment.setCompletionPercent(c); return this; }
        public EnrollmentBuilder completedAt(Instant c) { enrollment.setCompletedAt(c); return this; }
        public EnrollmentBuilder joinedAt(Instant j) { enrollment.setJoinedAt(j); return this; }
        public EnrollmentBuilder lastAccessedAt(Instant l) { enrollment.setLastAccessedAt(l); return this; }
        public Enrollment build() { return enrollment; }
    }
}

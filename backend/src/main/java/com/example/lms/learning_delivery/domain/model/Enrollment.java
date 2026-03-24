package com.example.lms.learning_delivery.domain.model;

import java.time.Instant;
import java.util.*;

/**
 * Enrollment aggregate.
 *
 * Following DDD principles:
 * - References to User aggregate are by ID only
 * - State changes through behavior methods with invariant validation
 * - Builder for construction and reconstitution from persistence
 */
public class Enrollment {

    private UUID id;
    private LearningClass learningClass;
    private UUID studentId;
    private EnrollmentStatus status = EnrollmentStatus.ACTIVE;
    private Map<String, LessonProgress> progress = new HashMap<>();
    private Integer completionPercent = 0;
    private Instant completedAt;
    private Instant enrolledAt;
    private Instant joinedAt;
    private Instant lastAccessedAt;
    private Long version;

    protected Enrollment() {}

    // ==================== Enums ====================

    public enum EnrollmentStatus {
        ACTIVE, COMPLETED, DROPPED, EXPIRED, SUSPENDED
    }

    // ==================== Behavior Methods ====================

    public void drop() {
        if (this.status == EnrollmentStatus.COMPLETED) {
            throw new IllegalStateException("Không thể hủy đăng ký đã hoàn thành");
        }
        this.status = EnrollmentStatus.DROPPED;
        this.lastAccessedAt = Instant.now();
    }

    public void complete() {
        this.status = EnrollmentStatus.COMPLETED;
        this.completionPercent = 100;
        this.completedAt = Instant.now();
        this.lastAccessedAt = Instant.now();
    }

    public void suspend() {
        if (this.status != EnrollmentStatus.ACTIVE) {
            throw new IllegalStateException("Chỉ có thể tạm ngưng đăng ký đang hoạt động");
        }
        this.status = EnrollmentStatus.SUSPENDED;
    }

    public void reactivate() {
        if (this.status != EnrollmentStatus.SUSPENDED && this.status != EnrollmentStatus.DROPPED) {
            throw new IllegalStateException("Chỉ có thể kích hoạt lại đăng ký bị tạm ngưng hoặc đã hủy");
        }
        this.status = EnrollmentStatus.ACTIVE;
    }

    public void updateProgress(String lessonId, LessonProgress newProgress) {
        if (!(this.progress instanceof HashMap)) {
            this.progress = this.progress != null ? new HashMap<>(this.progress) : new HashMap<>();
        }
        this.progress.put(lessonId, newProgress);
        this.lastAccessedAt = Instant.now();
    }

    public void updateCompletionPercent(int percent) {
        this.completionPercent = Math.max(0, Math.min(100, percent));
        if (this.completionPercent == 100 && this.status == EnrollmentStatus.ACTIVE) {
            complete();
        }
    }

    public boolean isActive() {
        return this.status == EnrollmentStatus.ACTIVE;
    }

    public UUID getClassId() {
        return learningClass != null ? learningClass.getId() : null;
    }

    // ==================== Getters (read-only access) ====================

    public UUID getId() { return id; }
    public LearningClass getLearningClass() { return learningClass; }
    public UUID getStudentId() { return studentId; }
    public EnrollmentStatus getStatus() { return status; }
    public Map<String, LessonProgress> getProgress() { return progress; }
    public Integer getCompletionPercent() { return completionPercent; }
    public Instant getCompletedAt() { return completedAt; }
    public Instant getEnrolledAt() { return enrolledAt; }
    public Instant getJoinedAt() { return joinedAt; }
    public Instant getLastAccessedAt() { return lastAccessedAt; }
    public Long getVersion() { return version; }

    // ==================== LessonProgress Value Object ====================

    public static class LessonProgress {
        private String status;
        private Integer watchSeconds;
        private Double grade;
        private Instant lastActivity;
        private List<String> completedSections;

        public LessonProgress() {}

        public LessonProgress(String status, Integer watchSeconds, Double grade, Instant lastActivity, List<String> completedSections) {
            this.status = status;
            this.watchSeconds = watchSeconds;
            this.grade = grade;
            this.lastActivity = lastActivity;
            this.completedSections = completedSections != null ? new ArrayList<>(completedSections) : null;
        }

        public static LessonProgressBuilder builder() { return new LessonProgressBuilder(); }

        public void addCompletedSection(String sectionId) {
            if (this.completedSections == null) {
                this.completedSections = new ArrayList<>();
            }
            if (!this.completedSections.contains(sectionId)) {
                this.completedSections.add(sectionId);
            }
            this.lastActivity = Instant.now();
        }

        public static class LessonProgressBuilder {
            private String status;
            private Integer watchSeconds;
            private Double grade;
            private Instant lastActivity;
            private List<String> completedSections;

            public LessonProgressBuilder status(String status) { this.status = status; return this; }
            public LessonProgressBuilder watchSeconds(Integer watchSeconds) { this.watchSeconds = watchSeconds; return this; }
            public LessonProgressBuilder grade(Double grade) { this.grade = grade; return this; }
            public LessonProgressBuilder lastActivity(Instant lastActivity) { this.lastActivity = lastActivity; return this; }
            public LessonProgressBuilder completedSections(List<String> completedSections) {
                this.completedSections = completedSections != null ? new ArrayList<>(completedSections) : null;
                return this;
            }

            public LessonProgress build() {
                return new LessonProgress(status, watchSeconds, grade, lastActivity, completedSections);
            }
        }

        public String getStatus() { return status; }
        public Integer getWatchSeconds() { return watchSeconds; }
        public Double getGrade() { return grade; }
        public Instant getLastActivity() { return lastActivity; }
        public List<String> getCompletedSections() { return completedSections; }
    }

    // ==================== Builder (for construction & reconstitution) ====================

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private UUID id;
        private LearningClass learningClass;
        private UUID studentId;
        private EnrollmentStatus status = EnrollmentStatus.ACTIVE;
        private Map<String, LessonProgress> progress = new HashMap<>();
        private Integer completionPercent = 0;
        private Instant completedAt;
        private Instant enrolledAt;
        private Instant joinedAt;
        private Instant lastAccessedAt;
        private Long version;

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder learningClass(LearningClass learningClass) { this.learningClass = learningClass; return this; }
        public Builder studentId(UUID studentId) { this.studentId = studentId; return this; }
        public Builder status(EnrollmentStatus status) { this.status = status; return this; }
        public Builder progress(Map<String, LessonProgress> progress) {
            this.progress = progress != null ? new HashMap<>(progress) : new HashMap<>();
            return this;
        }
        public Builder completionPercent(Integer completionPercent) { this.completionPercent = completionPercent; return this; }
        public Builder completedAt(Instant completedAt) { this.completedAt = completedAt; return this; }
        public Builder enrolledAt(Instant enrolledAt) { this.enrolledAt = enrolledAt; return this; }
        public Builder joinedAt(Instant joinedAt) { this.joinedAt = joinedAt; return this; }
        public Builder lastAccessedAt(Instant lastAccessedAt) { this.lastAccessedAt = lastAccessedAt; return this; }
        public Builder version(Long version) { this.version = version; return this; }

        public Enrollment build() {
            Enrollment e = new Enrollment();
            e.id = this.id;
            e.learningClass = this.learningClass;
            e.studentId = this.studentId;
            e.status = this.status;
            e.progress = this.progress != null ? new HashMap<>(this.progress) : new HashMap<>();
            e.completionPercent = this.completionPercent;
            e.completedAt = this.completedAt;
            e.enrolledAt = this.enrolledAt;
            e.joinedAt = this.joinedAt;
            e.lastAccessedAt = this.lastAccessedAt;
            e.version = this.version;
            return e;
        }
    }
}

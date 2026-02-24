package com.example.lms.learning_delivery.domain.model;

import java.time.Instant;
import java.util.UUID;

/**
 * LearningClass aggregate root.
 *
 * Following DDD principles:
 * - References to other aggregates (Course, User) are by ID only
 * - State changes go through behavior methods with invariant validation
 * - Builder used for construction and reconstitution from persistence
 */
public class LearningClass {

    private UUID id;
    private String name;
    private String code;
    private UUID courseVersionId;
    private UUID courseId;
    private UUID teacherId;
    private Instant startDate;
    private Instant endDate;
    private ScheduleType scheduleType = ScheduleType.CUSTOM;
    private String semester;
    private ClassStatus status = ClassStatus.OPEN;
    private Integer maxStudents = 9999;
    private Instant createdAt;
    private Instant updatedAt;

    protected LearningClass() {}

    // ==================== Enums ====================

    public enum ClassStatus {
        OPEN, CLOSED, ARCHIVED, CANCELLED
    }

    public enum ScheduleType {
        SEMESTER, CUSTOM
    }

    // ==================== Behavior Methods ====================

    public void close() {
        if (this.status == ClassStatus.CANCELLED) {
            throw new IllegalStateException("Không thể đóng lớp đã bị hủy");
        }
        this.status = ClassStatus.CLOSED;
        this.updatedAt = Instant.now();
    }

    public void archive() {
        this.status = ClassStatus.ARCHIVED;
        this.updatedAt = Instant.now();
    }

    public void cancel() {
        if (this.status == ClassStatus.CLOSED) {
            throw new IllegalStateException("Không thể hủy lớp đã đóng");
        }
        this.status = ClassStatus.CANCELLED;
        this.updatedAt = Instant.now();
    }

    public void reopen() {
        if (this.status != ClassStatus.CLOSED && this.status != ClassStatus.ARCHIVED) {
            throw new IllegalStateException("Chỉ có thể mở lại lớp đã đóng hoặc lưu trữ");
        }
        this.status = ClassStatus.OPEN;
        this.updatedAt = Instant.now();
    }

    public boolean canEnrollStudents() {
        return this.status == ClassStatus.OPEN;
    }

    public boolean isActive() {
        return this.status == ClassStatus.OPEN;
    }

    /**
     * Update class details. Used by UpdateLearningClassUseCase.
     */
    public void update(String name, String code, ClassStatus status,
                       Integer maxStudents, Instant startDate, Instant endDate) {
        if (name != null && !name.isBlank()) this.name = name;
        if (code != null && !code.isBlank()) this.code = code;
        if (status != null) this.status = status;
        if (maxStudents != null && maxStudents > 0) this.maxStudents = maxStudents;
        if (startDate != null) this.startDate = startDate;
        if (endDate != null) this.endDate = endDate;
        this.updatedAt = Instant.now();
    }

    // ==================== Getters (read-only access) ====================

    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getCode() { return code; }
    public UUID getCourseVersionId() { return courseVersionId; }
    public UUID getCourseId() { return courseId; }
    public UUID getTeacherId() { return teacherId; }
    public Instant getStartDate() { return startDate; }
    public Instant getEndDate() { return endDate; }
    public ScheduleType getScheduleType() { return scheduleType; }
    public String getSemester() { return semester; }
    public ClassStatus getStatus() { return status; }
    public Integer getMaxStudents() { return maxStudents; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    // ==================== Builder (for construction & reconstitution) ====================

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private UUID id;
        private String name;
        private String code;
        private UUID courseVersionId;
        private UUID courseId;
        private UUID teacherId;
        private Instant startDate;
        private Instant endDate;
        private ScheduleType scheduleType = ScheduleType.CUSTOM;
        private String semester;
        private ClassStatus status = ClassStatus.OPEN;
        private Integer maxStudents = 9999;
        private Instant createdAt;
        private Instant updatedAt;

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder code(String code) { this.code = code; return this; }
        public Builder courseVersionId(UUID courseVersionId) { this.courseVersionId = courseVersionId; return this; }
        public Builder courseId(UUID courseId) { this.courseId = courseId; return this; }
        public Builder teacherId(UUID teacherId) { this.teacherId = teacherId; return this; }
        public Builder startDate(Instant startDate) { this.startDate = startDate; return this; }
        public Builder endDate(Instant endDate) { this.endDate = endDate; return this; }
        public Builder scheduleType(ScheduleType scheduleType) { this.scheduleType = scheduleType; return this; }
        public Builder semester(String semester) { this.semester = semester; return this; }
        public Builder status(ClassStatus status) { this.status = status; return this; }
        public Builder maxStudents(Integer maxStudents) { this.maxStudents = maxStudents; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(Instant updatedAt) { this.updatedAt = updatedAt; return this; }

        public LearningClass build() {
            LearningClass lc = new LearningClass();
            lc.id = this.id;
            lc.name = this.name;
            lc.code = this.code;
            lc.courseVersionId = this.courseVersionId;
            lc.courseId = this.courseId;
            lc.teacherId = this.teacherId;
            lc.startDate = this.startDate;
            lc.endDate = this.endDate;
            lc.scheduleType = this.scheduleType;
            lc.semester = this.semester;
            lc.status = this.status;
            lc.maxStudents = this.maxStudents;
            lc.createdAt = this.createdAt;
            lc.updatedAt = this.updatedAt;
            return lc;
        }
    }
}

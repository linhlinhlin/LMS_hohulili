package com.example.lms.learning_delivery.domain.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "learning_classes")
public class Class {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotBlank
    @Column(nullable = false, unique = true)
    private String code;

    @NotNull
    @Column(name = "course_version_id", nullable = false)
    private UUID courseVersionId; 

    @NotNull
    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId; 

    @Column(name = "start_date")
    private Instant startDate;

    @Column(name = "end_date")
    private Instant endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ClassStatus status = ClassStatus.OPEN;
    
    @Column(name = "max_students")
    private Integer maxStudents;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
    
    public enum ClassStatus {
        OPEN, CLOSED, ARCHIVED
    }

    public Class() {}

    public Class(UUID id, String code, UUID courseVersionId, UUID teacherId, Instant startDate, Instant endDate, ClassStatus status, Integer maxStudents, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.code = code;
        this.courseVersionId = courseVersionId;
        this.teacherId = teacherId;
        this.startDate = startDate;
        this.endDate = endDate;
        this.status = status != null ? status : ClassStatus.OPEN;
        this.maxStudents = maxStudents;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public UUID getCourseVersionId() { return courseVersionId; }
    public void setCourseVersionId(UUID courseVersionId) { this.courseVersionId = courseVersionId; }
    public UUID getTeacherId() { return teacherId; }
    public void setTeacherId(UUID teacherId) { this.teacherId = teacherId; }
    public Instant getStartDate() { return startDate; }
    public void setStartDate(Instant startDate) { this.startDate = startDate; }
    public Instant getEndDate() { return endDate; }
    public void setEndDate(Instant endDate) { this.endDate = endDate; }
    public ClassStatus getStatus() { return status; }
    public void setStatus(ClassStatus status) { this.status = status; }
    public Integer getMaxStudents() { return maxStudents; }
    public void setMaxStudents(Integer maxStudents) { this.maxStudents = maxStudents; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    // Builder
    public static ClassBuilder builder() { return new ClassBuilder(); }
    public static class ClassBuilder {
        private Class c = new Class();
        public ClassBuilder id(UUID i) { c.setId(i); return this; }
        public ClassBuilder code(String co) { c.setCode(co); return this; }
        public ClassBuilder courseVersionId(UUID cv) { c.setCourseVersionId(cv); return this; }
        public ClassBuilder teacherId(UUID t) { c.setTeacherId(t); return this; }
        public ClassBuilder startDate(Instant s) { c.setStartDate(s); return this; }
        public ClassBuilder endDate(Instant e) { c.setEndDate(e); return this; }
        public ClassBuilder status(ClassStatus st) { c.setStatus(st); return this; }
        public ClassBuilder maxStudents(Integer m) { c.setMaxStudents(m); return this; }
        public ClassBuilder createdAt(Instant cr) { c.setCreatedAt(cr); return this; }
        public ClassBuilder updatedAt(Instant u) { c.setUpdatedAt(u); return this; }
        public Class build() { return c; }
    }
}

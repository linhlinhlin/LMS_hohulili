package com.example.lms.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.time.LocalDateTime;

@Entity
@Table(name = "assignment_allocation_students")
@IdClass(AssignmentAllocationStudentId.class)
public class AssignmentAllocationStudent {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "allocation_id", nullable = false)
    private AssignmentAllocation allocation;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @Column(name = "custom_deadline")
    private LocalDateTime customDeadline;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @CreationTimestamp
    @Column(name = "assigned_at", nullable = false, updatable = false)
    private Instant assignedAt;

    public AssignmentAllocationStudent() {}

    public AssignmentAllocationStudent(AssignmentAllocation allocation, User student, LocalDateTime customDeadline, String note, Instant assignedAt) {
        this.allocation = allocation;
        this.student = student;
        this.customDeadline = customDeadline;
        this.note = note;
        this.assignedAt = assignedAt;
    }

    // Manual Getters/Setters
    public AssignmentAllocation getAllocation() { return allocation; }
    public void setAllocation(AssignmentAllocation allocation) { this.allocation = allocation; }
    public User getStudent() { return student; }
    public void setStudent(User student) { this.student = student; }
    public LocalDateTime getCustomDeadline() { return customDeadline; }
    public void setCustomDeadline(LocalDateTime customDeadline) { this.customDeadline = customDeadline; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public Instant getAssignedAt() { return assignedAt; }
    public void setAssignedAt(Instant assignedAt) { this.assignedAt = assignedAt; }

    // Manual Builder
    public static AssignmentAllocationStudentBuilder builder() { return new AssignmentAllocationStudentBuilder(); }
    public static class AssignmentAllocationStudentBuilder {
        private AssignmentAllocationStudent s = new AssignmentAllocationStudent();
        public AssignmentAllocationStudentBuilder allocation(AssignmentAllocation a) { s.setAllocation(a); return this; }
        public AssignmentAllocationStudentBuilder student(User st) { s.setStudent(st); return this; }
        public AssignmentAllocationStudentBuilder customDeadline(LocalDateTime c) { s.setCustomDeadline(c); return this; }
        public AssignmentAllocationStudentBuilder note(String n) { s.setNote(n); return this; }
        public AssignmentAllocationStudentBuilder assignedAt(Instant a) { s.setAssignedAt(a); return this; }
        public AssignmentAllocationStudent build() { return s; }
    }
}

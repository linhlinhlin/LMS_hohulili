package com.example.lms.entity;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

/**
 * Composite key cho AssignmentAllocationStudent
 */
public class AssignmentAllocationStudentId implements Serializable {
    private UUID allocation;
    private UUID student;

    public AssignmentAllocationStudentId() {}

    public AssignmentAllocationStudentId(UUID allocation, UUID student) {
        this.allocation = allocation;
        this.student = student;
    }

    public UUID getAllocation() { return allocation; }
    public void setAllocation(UUID allocation) { this.allocation = allocation; }
    public UUID getStudent() { return student; }
    public void setStudent(UUID student) { this.student = student; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        AssignmentAllocationStudentId that = (AssignmentAllocationStudentId) o;
        return Objects.equals(allocation, that.allocation) && Objects.equals(student, that.student);
    }

    @Override
    public int hashCode() {
        return Objects.hash(allocation, student);
    }
}

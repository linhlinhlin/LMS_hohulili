package com.example.lms.entity;

import com.example.lms.learning_delivery.domain.model.LearningClass;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "assignment_allocations")
public class AssignmentAllocation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignment_id", nullable = false)
    private Assignment assignment;

    @Column(name = "distribution_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private DistributionType distributionType = DistributionType.ALL_STUDENTS;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "is_individual")
    private Boolean isIndividual = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id")
    private LearningClass learningClass;

    @OneToMany(mappedBy = "allocation", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<AssignmentAllocationStudent> allocatedStudents = new HashSet<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public enum DistributionType {
        ALL_STUDENTS,
        SPECIFIC_STUDENTS,
        CLASS // Class distribution
    }

    public AssignmentAllocation() {}

    public AssignmentAllocation(UUID id, Assignment assignment, DistributionType distributionType, User createdBy, Boolean isIndividual, LearningClass learningClass, Set<AssignmentAllocationStudent> allocatedStudents, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.assignment = assignment;
        this.distributionType = distributionType != null ? distributionType : DistributionType.ALL_STUDENTS;
        this.createdBy = createdBy;
        this.isIndividual = isIndividual != null ? isIndividual : false;
        this.learningClass = learningClass;
        this.allocatedStudents = allocatedStudents != null ? allocatedStudents : new HashSet<>();
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // Manual Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Assignment getAssignment() { return assignment; }
    public void setAssignment(Assignment assignment) { this.assignment = assignment; }
    public DistributionType getDistributionType() { return distributionType; }
    public void setDistributionType(DistributionType distributionType) { this.distributionType = distributionType; }
    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }
    public Boolean getIsIndividual() { return isIndividual; }
    public void setIsIndividual(Boolean isIndividual) { this.isIndividual = isIndividual; }
    public LearningClass getLearningClass() { return learningClass; }
    public void setLearningClass(LearningClass learningClass) { this.learningClass = learningClass; }
    public Set<AssignmentAllocationStudent> getAllocatedStudents() { return allocatedStudents; }
    public void setAllocatedStudents(Set<AssignmentAllocationStudent> allocatedStudents) { this.allocatedStudents = allocatedStudents; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    // Helper methods
    public void addStudent(User student, LocalDateTime customDeadline) {
        // Warning: AssignmentAllocationStudent builder relies on AssignmentAllocationStudent
        AssignmentAllocationStudent allocationStudent = new AssignmentAllocationStudent();
        allocationStudent.setAllocation(this);
        allocationStudent.setStudent(student);
        allocationStudent.setCustomDeadline(customDeadline);
        
        this.allocatedStudents.add(allocationStudent);
    }

    public void removeStudent(User student) {
        this.allocatedStudents.removeIf(as -> as.getStudent().getId().equals(student.getId()));
    }

    public boolean hasStudent(UUID studentId) {
        return this.allocatedStudents.stream()
                .anyMatch(as -> as.getStudent().getId().equals(studentId));
    }

    public static AssignmentAllocationBuilder builder() { return new AssignmentAllocationBuilder(); }
    public static class AssignmentAllocationBuilder {
        private AssignmentAllocation a = new AssignmentAllocation();
        public AssignmentAllocationBuilder id(UUID id) { a.setId(id); return this; }
        public AssignmentAllocationBuilder assignment(Assignment asset) { a.setAssignment(asset); return this; }
        public AssignmentAllocationBuilder distributionType(DistributionType d) { a.setDistributionType(d); return this; }
        public AssignmentAllocationBuilder createdBy(User u) { a.setCreatedBy(u); return this; }
        public AssignmentAllocationBuilder isIndividual(Boolean i) { a.setIsIndividual(i); return this; }
        public AssignmentAllocationBuilder learningClass(LearningClass c) { a.setLearningClass(c); return this; }
        public AssignmentAllocationBuilder allocatedStudents(Set<AssignmentAllocationStudent> s) { a.setAllocatedStudents(s); return this; }
        public AssignmentAllocationBuilder createdAt(Instant c) { a.setCreatedAt(c); return this; }
        public AssignmentAllocationBuilder updatedAt(Instant u) { a.setUpdatedAt(u); return this; }
        public AssignmentAllocation build() { return a; }
    }
}

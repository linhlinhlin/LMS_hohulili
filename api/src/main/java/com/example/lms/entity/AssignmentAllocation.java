package com.example.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * Entity lưu trữ thông tin phân phối bài tập cho học viên.
 * 
 * Hỗ trợ 2 loại phân phối:
 * - ALL_STUDENTS: Giao cho tất cả học viên trong khóa học (bao gồm học viên mới đăng ký sau)
 * - SPECIFIC_STUDENTS: Giao cho danh sách học viên cụ thể
 */
@Entity
@Table(name = "assignment_allocations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentAllocation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignment_id", nullable = false)
    private Assignment assignment;

    @Column(name = "distribution_type", nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private DistributionType distributionType = DistributionType.ALL_STUDENTS;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "is_individual")
    @Builder.Default
    private Boolean isIndividual = false;

    @OneToMany(mappedBy = "allocation", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private Set<AssignmentAllocationStudent> allocatedStudents = new HashSet<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public enum DistributionType {
        ALL_STUDENTS,      // Giao cho tất cả học viên trong khóa học
        SPECIFIC_STUDENTS  // Giao cho danh sách học viên cụ thể
    }

    // Helper methods
    public void addStudent(User student, LocalDateTime customDeadline) {
        AssignmentAllocationStudent allocationStudent = AssignmentAllocationStudent.builder()
                .allocation(this)
                .student(student)
                .customDeadline(customDeadline)
                .build();
        this.allocatedStudents.add(allocationStudent);
    }

    public void removeStudent(User student) {
        this.allocatedStudents.removeIf(as -> as.getStudent().getId().equals(student.getId()));
    }

    public boolean hasStudent(UUID studentId) {
        return this.allocatedStudents.stream()
                .anyMatch(as -> as.getStudent().getId().equals(studentId));
    }
}

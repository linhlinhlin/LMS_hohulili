package com.example.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity lưu trữ học viên cụ thể được giao bài tập.
 * Chỉ sử dụng khi distributionType = SPECIFIC_STUDENTS
 * 
 * Hỗ trợ:
 * - Custom deadline cho từng học viên
 * - Ghi chú riêng cho từng học viên
 */
@Entity
@Table(name = "assignment_allocation_students")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
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
}

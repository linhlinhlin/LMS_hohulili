package com.example.lms.assessment.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "assignment_allocation_students")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@IdClass(AssignmentAllocationStudentId.class)
public class AssignmentAllocationStudentJpaEntity {

    @Id
    @Column(name = "allocation_id")
    private UUID allocationId;

    @Id
    @Column(name = "student_id")
    private UUID studentId;

    @Column(name = "assigned_at")
    private Instant assignedAt;

    @Column(name = "custom_deadline")
    private Instant customDeadline;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;
}

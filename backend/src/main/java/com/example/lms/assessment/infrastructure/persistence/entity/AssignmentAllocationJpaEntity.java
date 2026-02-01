package com.example.lms.assessment.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * JPA Entity for AssignmentAllocation (allocating assignments to students/classes).
 */
@Entity
@Table(name = "assignment_allocations")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentAllocationJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "assignment_id", nullable = false)
    private UUID assignmentId;

    @Column(name = "distribution_type")
    private String distributionType;

    @Column(name = "class_id")
    private UUID classId;

    @Column(name = "allocator_id")
    private UUID allocatorId;

    @Column(name = "due_date")
    private Instant dueDate;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "allocated_at", updatable = false)
    private Instant allocatedAt;
}

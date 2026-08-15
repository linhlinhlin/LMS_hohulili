package com.example.lms.academic.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "curriculum_plans")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AcademicCurriculumPlanJpaEntity {
    @Id
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "program_id", nullable = false)
    private UUID programId;

    @Column(name = "cohort_id")
    private UUID cohortId;

    @Column(nullable = false, length = 64)
    private String code;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(name = "total_credits", nullable = false)
    private Integer totalCredits;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (status == null) status = "ACTIVE";
        if (totalCredits == null) totalCredits = 0;
        if (createdAt == null) createdAt = Instant.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}

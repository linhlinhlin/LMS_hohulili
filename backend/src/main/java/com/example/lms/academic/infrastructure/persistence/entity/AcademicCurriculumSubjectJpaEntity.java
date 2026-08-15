package com.example.lms.academic.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "curriculum_subjects")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AcademicCurriculumSubjectJpaEntity {
    @Id
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "curriculum_plan_id", nullable = false)
    private UUID curriculumPlanId;

    @Column(name = "subject_id", nullable = false)
    private UUID subjectId;

    @Column(name = "term_id")
    private UUID termId;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    @Column(name = "is_required", nullable = false)
    private boolean required;

    @Column(name = "credits_override")
    private Integer creditsOverride;

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
        if (displayOrder == null) displayOrder = 0;
        if (createdAt == null) createdAt = Instant.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}

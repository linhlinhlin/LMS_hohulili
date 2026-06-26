package com.example.lms.academic.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "learning_packages")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AcademicLearningPackageJpaEntity {
    @Id
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "curriculum_plan_id")
    private UUID curriculumPlanId;

    @Column(nullable = false, length = 64)
    private String code;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "package_type", nullable = false, length = 32)
    private String packageType;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal price;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(name = "enrollment_policy", nullable = false, length = 32)
    private String enrollmentPolicy;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (packageType == null) packageType = "CURRICULUM_BUNDLE";
        if (price == null) price = BigDecimal.ZERO;
        if (currency == null) currency = "VND";
        if (enrollmentPolicy == null) enrollmentPolicy = "ORG_APPROVAL";
        if (status == null) status = "ACTIVE";
        if (createdAt == null) createdAt = Instant.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}

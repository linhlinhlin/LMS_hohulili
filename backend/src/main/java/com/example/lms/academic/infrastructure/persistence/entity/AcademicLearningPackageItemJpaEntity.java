package com.example.lms.academic.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "learning_package_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AcademicLearningPackageItemJpaEntity {
    @Id
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "package_id", nullable = false)
    private UUID packageId;

    @Column(name = "subject_id")
    private UUID subjectId;

    @Column(name = "course_id")
    private UUID courseId;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    @Column(name = "is_required", nullable = false)
    private boolean required;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (displayOrder == null) displayOrder = 0;
        if (status == null) status = "ACTIVE";
        if (createdAt == null) createdAt = Instant.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}

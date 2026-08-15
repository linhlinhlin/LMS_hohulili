package com.example.lms.academic.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "academic_subjects")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AcademicSubjectJpaEntity {
    @Id
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "department_id")
    private UUID departmentId;

    @Column(nullable = false, length = 64)
    private String code;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(nullable = false)
    private Integer credits;

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
        if (credits == null) credits = 0;
        if (createdAt == null) createdAt = Instant.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}

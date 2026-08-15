package com.example.lms.academic.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "academic_terms")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AcademicTermJpaEntity {
    @Id
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(nullable = false, length = 64)
    private String code;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(name = "academic_year", nullable = false, length = 16)
    private String academicYear;

    @Column(name = "term_number", nullable = false)
    private Integer termNumber;

    @Column(name = "starts_on")
    private LocalDate startsOn;

    @Column(name = "ends_on")
    private LocalDate endsOn;

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
        if (createdAt == null) createdAt = Instant.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}

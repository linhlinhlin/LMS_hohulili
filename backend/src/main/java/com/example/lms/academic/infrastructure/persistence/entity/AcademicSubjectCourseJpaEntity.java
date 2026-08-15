package com.example.lms.academic.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "academic_subject_courses")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AcademicSubjectCourseJpaEntity {
    @Id
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "subject_id", nullable = false)
    private UUID subjectId;

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Column(name = "is_primary", nullable = false)
    private boolean primary;

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

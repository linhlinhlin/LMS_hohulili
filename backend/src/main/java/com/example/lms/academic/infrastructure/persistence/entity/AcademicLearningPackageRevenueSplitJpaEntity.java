package com.example.lms.academic.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "learning_package_revenue_splits")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AcademicLearningPackageRevenueSplitJpaEntity {
    @Id
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "enrollment_id", nullable = false)
    private UUID enrollmentId;

    @Column(name = "package_id", nullable = false)
    private UUID packageId;

    @Column(name = "package_item_id", nullable = false)
    private UUID packageItemId;

    @Column(name = "subject_id")
    private UUID subjectId;

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId;

    @Column(name = "gross_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal grossAmount;

    @Column(nullable = false, length = 3)
    @Builder.Default
    private String currency = "VND";

    @Column(name = "platform_fee_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal platformFeePct;

    @Column(name = "teacher_share_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal teacherSharePct;

    @Column(name = "org_share_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal orgSharePct;

    @Column(name = "platform_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal platformAmount;

    @Column(name = "teacher_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal teacherAmount;

    @Column(name = "org_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal orgAmount;

    @Column(name = "payment_reference", length = 128)
    private String paymentReference;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (currency == null || currency.isBlank()) currency = "VND";
        if (createdAt == null) createdAt = Instant.now();
    }
}

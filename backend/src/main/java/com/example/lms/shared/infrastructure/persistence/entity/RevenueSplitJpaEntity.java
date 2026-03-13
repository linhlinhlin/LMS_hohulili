package com.example.lms.shared.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "revenue_splits")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RevenueSplitJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "payment_id", nullable = false, unique = true)
    private UUID paymentId;

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId;

    @Column(name = "org_id")
    private UUID orgId;   // nullable = individual/default org

    @Column(name = "gross_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal grossAmount;

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

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}

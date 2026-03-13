package com.example.lms.shared.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "org_payment_configs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OrgPaymentConfigJpaEntity {

    @Id
    @Column(name = "org_id")
    private UUID orgId;

    @Column(name = "platform_fee_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal platformFeePct;

    @Column(name = "teacher_share_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal teacherSharePct;

    @Column(name = "min_payout_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal minPayoutAmount;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}

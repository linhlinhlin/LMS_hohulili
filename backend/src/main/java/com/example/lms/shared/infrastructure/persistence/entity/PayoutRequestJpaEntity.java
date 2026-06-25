package com.example.lms.shared.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payout_requests")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PayoutRequestJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId;

    @Column(name = "bank_account_id", nullable = false)
    private UUID bankAccountId;

    @Column(name = "amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(name = "status", nullable = false, length = 20)
    private String status;   // PENDING, APPROVED, REJECTED, COMPLETED

    @Column(name = "teacher_note")
    private String teacherNote;

    @Column(name = "admin_note")
    private String adminNote;

    @Column(name = "processed_by")
    private UUID processedBy;

    @CreationTimestamp
    @Column(name = "requested_at", nullable = false, updatable = false)
    private Instant requestedAt;

    @Column(name = "processed_at")
    private Instant processedAt;
}

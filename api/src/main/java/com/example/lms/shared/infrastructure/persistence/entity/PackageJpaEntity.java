package com.example.lms.shared.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * JPA Entity for Package persistence.
 */
@Entity
@Table(name = "packages")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PackageJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(precision = 19, scale = 2)
    private BigDecimal price;

    @Column(name = "duration_days")
    @Builder.Default
    private Integer durationDays = 365;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}

package com.example.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "assignment_rubrics")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentRubric {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignment_id", nullable = false)
    private Assignment assignment;
    
    @Column(name = "criteria_name", nullable = false)
    private String criteriaName;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "max_points", precision = 5, scale = 2, nullable = false)
    private BigDecimal maxPoints;
    
    @Column(name = "weight", precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal weight = BigDecimal.valueOf(1.00); // 0-1 percentage
    
    @Column(name = "order_index")
    @Builder.Default
    private Integer orderIndex = 0;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
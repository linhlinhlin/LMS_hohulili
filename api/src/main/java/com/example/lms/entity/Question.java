package com.example.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "questions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "difficulty", nullable = false)
    @Builder.Default
    private Difficulty difficulty = Difficulty.MEDIUM;

    @Column(columnDefinition = "TEXT")
    private String tags; // JSON array of tags

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private Status status = Status.DRAFT;

    @Column(name = "correct_option", nullable = false)
    private String correctOption; // A, B, C, D

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "usage_count", nullable = false)
    @Builder.Default
    private Integer usageCount = 0;

    @Column(name = "correct_rate", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal correctRate = BigDecimal.ZERO; // percentage (0.0 to 100.0)

    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("optionKey ASC")
    @Builder.Default
    private List<QuestionOption> options = new java.util.ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public enum Difficulty {
        EASY, MEDIUM, HARD
    }

    public enum Status {
        DRAFT, ACTIVE, INACTIVE
    }
}
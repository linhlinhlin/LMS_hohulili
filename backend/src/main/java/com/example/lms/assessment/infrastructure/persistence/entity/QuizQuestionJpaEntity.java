package com.example.lms.assessment.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * JPA Entity for QuizQuestion persistence.
 */
@Entity
@Table(name = "quiz_questions")
public class QuizQuestionJpaEntity {
    // Manual boilerplate
    public QuizQuestionJpaEntity() {}
    public QuizQuestionJpaEntity(UUID id, QuizJpaEntity quiz, UUID questionId, Integer displayOrder, Integer points) {
        this.id = id; this.quiz = quiz; this.questionId = questionId; this.displayOrder = displayOrder; this.points = points;
    }
    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private UUID id; private QuizJpaEntity quiz; private UUID questionId; private Integer displayOrder = 0; private Integer points = 1;
        public Builder id(UUID id) { this.id = id; return this; }
        public Builder quiz(QuizJpaEntity quiz) { this.quiz = quiz; return this; }
        public Builder questionId(UUID questionId) { this.questionId = questionId; return this; }
        public Builder displayOrder(Integer displayOrder) { this.displayOrder = displayOrder; return this; }
        public Builder points(Integer points) { this.points = points; return this; }
        public QuizQuestionJpaEntity build() { return new QuizQuestionJpaEntity(id, quiz, questionId, displayOrder, points); }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quiz_id", nullable = false)
    private QuizJpaEntity quiz;

    @Column(name = "question_id", nullable = false)
    private UUID questionId;

    @Column(name = "display_order")
    private Integer displayOrder = 0;

    @Column
    private Integer points = 1;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    // Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public QuizJpaEntity getQuiz() { return quiz; }
    public void setQuiz(QuizJpaEntity quiz) { this.quiz = quiz; }
    public UUID getQuestionId() { return questionId; }
    public void setQuestionId(UUID questionId) { this.questionId = questionId; }
    public Integer getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }
    public Integer getPoints() { return points; }
    public void setPoints(Integer points) { this.points = points; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}

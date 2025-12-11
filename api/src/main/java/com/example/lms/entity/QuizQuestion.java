package com.example.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "quiz_questions", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"quiz_id", "question_id"})
})
// Lombok annotations removed/ignored
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class QuizQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quiz_id", nullable = false)
    @JsonIgnore
    private Quiz quiz;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    // Manual Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Quiz getQuiz() { return quiz; }
    public void setQuiz(Quiz quiz) { this.quiz = quiz; }
    public Question getQuestion() { return question; }
    public void setQuestion(Question question) { this.question = question; }
    public Integer getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }

    // Manual Builder
    public static QuizQuestionBuilder builder() { return new QuizQuestionBuilder(); }
    public static class QuizQuestionBuilder {
        private Quiz quiz;
        private Question question;
        private Integer displayOrder;
        public QuizQuestionBuilder quiz(Quiz q) { this.quiz = q; return this; }
        public QuizQuestionBuilder question(Question q) { this.question = q; return this; }
        public QuizQuestionBuilder displayOrder(Integer d) { this.displayOrder = d; return this; }
        public QuizQuestion build() {
            QuizQuestion qq = new QuizQuestion();
            qq.setQuiz(quiz);
            qq.setQuestion(question);
            qq.setDisplayOrder(displayOrder);
            return qq;
        }
    }
}
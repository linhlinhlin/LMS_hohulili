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

    @Column(name = "question", columnDefinition = "TEXT")
    private String questionContent;

    @Column(name = "type")
    private String type;

    @Column(name = "content_blocks", columnDefinition = "text")
    @Convert(converter = com.example.lms.converter.ContentBlockListConverter.class)
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    private java.util.List<com.example.lms.domain.ContentBlock> contentBlocks;

    // Manual Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Quiz getQuiz() { return quiz; }
    public void setQuiz(Quiz quiz) { this.quiz = quiz; }
    public Question getQuestion() { return question; }
    public void setQuestion(Question question) { this.question = question; }
    public Integer getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }
    public String getQuestionContent() { return questionContent; }
    public void setQuestionContent(String questionContent) { this.questionContent = questionContent; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public java.util.List<com.example.lms.domain.ContentBlock> getContentBlocks() { return contentBlocks; }
    public void setContentBlocks(java.util.List<com.example.lms.domain.ContentBlock> contentBlocks) { this.contentBlocks = contentBlocks; }

    // Manual Builder
    public static QuizQuestionBuilder builder() { return new QuizQuestionBuilder(); }
    public static class QuizQuestionBuilder {
        private Quiz quiz;
        private Question question;
        private Integer displayOrder;
        private String questionContent;
        private String type;
        private java.util.List<com.example.lms.domain.ContentBlock> contentBlocks;
        
        public QuizQuestionBuilder quiz(Quiz q) { this.quiz = q; return this; }
        public QuizQuestionBuilder question(Question q) { this.question = q; return this; }
        public QuizQuestionBuilder displayOrder(Integer d) { this.displayOrder = d; return this; }
        public QuizQuestionBuilder questionContent(String s) { this.questionContent = s; return this; }
        public QuizQuestionBuilder type(String t) { this.type = t; return this; }
        public QuizQuestionBuilder contentBlocks(java.util.List<com.example.lms.domain.ContentBlock> cb) { this.contentBlocks = cb; return this; }
        
        public QuizQuestion build() {
            QuizQuestion qq = new QuizQuestion();
            qq.setQuiz(quiz);
            qq.setQuestion(question);
            qq.setDisplayOrder(displayOrder);
            qq.setQuestionContent(questionContent);
            qq.setType(type);
            qq.setContentBlocks(contentBlocks);
            return qq;
        }
    }
}

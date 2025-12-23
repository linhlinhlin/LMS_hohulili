package com.example.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.UUID;

@Entity
@Table(name = "question_options")
public class QuestionOption {
    public QuestionOption() {}

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    @JsonIgnore
    private Question question;

    @Column(name = "option_key", nullable = false, length = 1)
    private String optionKey; // A, B, C, D

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;

    // Manual Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Question getQuestion() { return question; }
    public void setQuestion(Question question) { this.question = question; }
    public String getOptionKey() { return optionKey; }
    public void setOptionKey(String optionKey) { this.optionKey = optionKey; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public Integer getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }

    // Builder
    public static QuestionOptionBuilder builder() { return new QuestionOptionBuilder(); }
    public static class QuestionOptionBuilder {
        private QuestionOption o = new QuestionOption();
        public QuestionOptionBuilder id(UUID id) { o.setId(id); return this; }
        public QuestionOptionBuilder question(Question question) { o.setQuestion(question); return this; }
        public QuestionOptionBuilder optionKey(String key) { o.setOptionKey(key); return this; }
        public QuestionOptionBuilder content(String content) { o.setContent(content); return this; }
        public QuestionOptionBuilder displayOrder(Integer order) { o.setDisplayOrder(order); return this; }
        public QuestionOption build() { return o; }
    }
}

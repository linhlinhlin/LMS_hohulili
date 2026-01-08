package com.example.lms.assessment.infrastructure.persistence.entity;

import com.example.lms.shared.domain.model.ContentBlock;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import org.hibernate.annotations.Type;

import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "question_options")
public class QuestionOptionJpaEntity {
    // Manual boilerplate
    public QuestionOptionJpaEntity() {}
    public QuestionOptionJpaEntity(UUID id, QuestionJpaEntity question, String key, List<ContentBlock> contentBlocks, Boolean isCorrect, Integer orderIndex) {
        this.id = id; this.question = question; this.key = key; this.contentBlocks = contentBlocks; this.isCorrect = isCorrect; this.orderIndex = orderIndex;
    }
    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private UUID id; private QuestionJpaEntity question; private String key; private List<ContentBlock> contentBlocks; private Boolean isCorrect = false; private Integer orderIndex = 0;
        public Builder id(UUID id) { this.id = id; return this; }
        public Builder question(QuestionJpaEntity question) { this.question = question; return this; }
        public Builder key(String key) { this.key = key; return this; }
        public Builder contentBlocks(List<ContentBlock> contentBlocks) { this.contentBlocks = contentBlocks; return this; }
        public Builder isCorrect(Boolean isCorrect) { this.isCorrect = isCorrect; return this; }
        public Builder orderIndex(Integer orderIndex) { this.orderIndex = orderIndex; return this; }
        public QuestionOptionJpaEntity build() { return new QuestionOptionJpaEntity(id, question, key, contentBlocks, isCorrect, orderIndex); }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private QuestionJpaEntity question;

    @Column(name = "option_key", nullable = false) // Map field 'key' to column 'option_key'
    private String key; 

    @Type(JsonType.class)
    @Column(name = "content", columnDefinition = "jsonb")
    private List<ContentBlock> contentBlocks; // Rich text content mapped to 'content' column

    @Column(name = "is_correct")
    private Boolean isCorrect = false;

    @Column(name = "display_order")
    private Integer orderIndex = 0;
    
    // Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public QuestionJpaEntity getQuestion() { return question; }
    public void setQuestion(QuestionJpaEntity question) { this.question = question; }
    public String getKey() { return key; }
    public void setKey(String key) { this.key = key; }
    public List<ContentBlock> getContentBlocks() { return contentBlocks; }
    public void setContentBlocks(List<ContentBlock> contentBlocks) { this.contentBlocks = contentBlocks; }
    public Boolean getIsCorrect() { return isCorrect; }
    public void setIsCorrect(Boolean isCorrect) { this.isCorrect = isCorrect; }
    public Integer getOrderIndex() { return orderIndex; }
    public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
}

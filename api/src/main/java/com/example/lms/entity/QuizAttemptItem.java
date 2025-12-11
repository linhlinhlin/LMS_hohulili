package com.example.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.UUID;

@Entity
@Table(name = "quiz_attempt_items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizAttemptItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attempt_id", nullable = false)
    @JsonIgnore
    private QuizAttempt attempt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    @JsonIgnore
    private Question question;

    @Column(name = "selected_option")
    private String selectedOption; // A, B, C, D or null if not answered

    @Column(name = "is_correct")
    private Boolean isCorrect;

    @Column(name = "time_spent_seconds")
    private Long timeSpentSeconds;

    // Manual Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public QuizAttempt getAttempt() { return attempt; }
    public void setAttempt(QuizAttempt attempt) { this.attempt = attempt; }
    public Question getQuestion() { return question; }
    public void setQuestion(Question question) { this.question = question; }
    public String getSelectedOption() { return selectedOption; }
    public void setSelectedOption(String selectedOption) { this.selectedOption = selectedOption; }
    public Boolean getIsCorrect() { return isCorrect; }
    public void setIsCorrect(Boolean isCorrect) { this.isCorrect = isCorrect; }
    public Long getTimeSpentSeconds() { return timeSpentSeconds; }
    public void setTimeSpentSeconds(Long timeSpentSeconds) { this.timeSpentSeconds = timeSpentSeconds; }

    // Manual Builder
    public static QuizAttemptItemBuilder builder() { return new QuizAttemptItemBuilder(); }
    public static class QuizAttemptItemBuilder {
        private QuizAttempt attempt;
        private Question question;
        private String selectedOption;
        private Boolean isCorrect;
        private Long timeSpentSeconds;
        public QuizAttemptItemBuilder attempt(QuizAttempt attempt) { this.attempt = attempt; return this; }
        public QuizAttemptItemBuilder question(Question question) { this.question = question; return this; }
        public QuizAttemptItemBuilder selectedOption(String s) { this.selectedOption = s; return this; }
        public QuizAttemptItemBuilder isCorrect(Boolean b) { this.isCorrect = b; return this; }
        public QuizAttemptItemBuilder timeSpentSeconds(Long t) { this.timeSpentSeconds = t; return this; }
        public QuizAttemptItem build() {
             QuizAttemptItem item = new QuizAttemptItem();
             item.setAttempt(attempt);
             item.setQuestion(question);
             item.setSelectedOption(selectedOption);
             item.setIsCorrect(isCorrect);
             item.setTimeSpentSeconds(timeSpentSeconds);
             return item;
        }
    }
}
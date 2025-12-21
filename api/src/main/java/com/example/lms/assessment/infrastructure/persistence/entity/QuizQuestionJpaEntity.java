package com.example.lms.assessment.infrastructure.persistence.entity;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.util.List;
import java.util.UUID;

/**
 * JPA Entity for QuizQuestion persistence.
 */
@Entity
@Table(name = "quiz_questions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizQuestionJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "quiz_id", nullable = false)
    private UUID quizId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String question;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private QuestionType type = QuestionType.SINGLE_CHOICE;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    private List<QuestionOptionData> options;

    @Column(name = "correct_answer")
    private String correctAnswer;

    @Column
    @Builder.Default
    private Integer points = 1;

    @Column(name = "order_index")
    @Builder.Default
    private Integer orderIndex = 0;

    @Column(columnDefinition = "TEXT")
    private String explanation;

    public enum QuestionType {
        SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER, ESSAY
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class QuestionOptionData {
        private String id;
        private String text;
        private Boolean isCorrect;
    }
}

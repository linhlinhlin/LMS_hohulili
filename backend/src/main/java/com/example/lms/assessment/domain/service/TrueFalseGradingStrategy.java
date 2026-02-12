package com.example.lms.assessment.domain.service;

import com.example.lms.assessment.domain.model.Question;

import java.util.Map;

/**
 * Grading strategy for TRUE_FALSE questions.
 * Simple boolean comparison.
 */
public class TrueFalseGradingStrategy implements GradingStrategy {

    @Override
    public GradeResult grade(Question question, Map<String, Object> studentAnswer) {
        double maxPoints = 1.0;
        String correctAnswer = resolveCorrectAnswer(question);
        String selected = resolveSelectedAnswer(studentAnswer);

        if (correctAnswer == null || selected == null) {
            return GradeResult.incorrect(maxPoints);
        }

        boolean isCorrect = correctAnswer.equalsIgnoreCase(selected.trim());
        return isCorrect ? GradeResult.correct(maxPoints) : GradeResult.incorrect(maxPoints);
    }

    @Override
    public Question.QuestionType getQuestionType() {
        return Question.QuestionType.TRUE_FALSE;
    }

    private String resolveCorrectAnswer(Question question) {
        if (question.getAnswerKey() != null && question.getAnswerKey().containsKey("correctOption")) {
            return String.valueOf(question.getAnswerKey().get("correctOption"));
        }
        return question.getCorrectOption();
    }

    private String resolveSelectedAnswer(Map<String, Object> studentAnswer) {
        if (studentAnswer == null) return null;
        Object selected = studentAnswer.get("selectedOption");
        return selected != null ? String.valueOf(selected) : null;
    }
}

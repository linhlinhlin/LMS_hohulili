package com.example.lms.assessment.domain.service;

import com.example.lms.assessment.domain.model.Question;

import java.util.Map;

/**
 * Grading strategy for SINGLE_CHOICE questions.
 * Compares student's selected option against the correct option.
 * Supports both legacy correctOption and new answerKey format.
 */
public class SingleChoiceGradingStrategy implements GradingStrategy {

    @Override
    public GradeResult grade(Question question, Map<String, Object> studentAnswer) {
        double maxPoints = 1.0;
        String correctOption = resolveCorrectOption(question);
        String selected = resolveSelectedOption(studentAnswer);

        if (correctOption == null || selected == null) {
            return GradeResult.incorrect(maxPoints);
        }

        boolean isCorrect = correctOption.equalsIgnoreCase(selected.trim());
        return isCorrect ? GradeResult.correct(maxPoints) : GradeResult.incorrect(maxPoints);
    }

    @Override
    public Question.QuestionType getQuestionType() {
        return Question.QuestionType.SINGLE_CHOICE;
    }

    private String resolveCorrectOption(Question question) {
        // Prefer answerKey, fall back to legacy correctOption
        if (question.getAnswerKey() != null && question.getAnswerKey().containsKey("correctOption")) {
            return String.valueOf(question.getAnswerKey().get("correctOption"));
        }
        return question.getCorrectOption();
    }

    private String resolveSelectedOption(Map<String, Object> studentAnswer) {
        if (studentAnswer == null) return null;
        // New format: {"selectedOption": "A"}
        Object selected = studentAnswer.get("selectedOption");
        return selected != null ? String.valueOf(selected) : null;
    }
}

package com.example.lms.assessment.domain.service;

import com.example.lms.assessment.domain.model.Question;

import java.util.List;
import java.util.Map;

/**
 * Grading strategy for FILL_IN_BLANK questions.
 * Checks student's text answer against a list of accepted answers.
 * Supports case-sensitive and case-insensitive matching.
 * Reference: Canvas LMS "Fill In The Blank", Moodle "Short Answer" type.
 */
public class FillInBlankGradingStrategy implements GradingStrategy {

    @Override
    @SuppressWarnings("unchecked")
    public GradeResult grade(Question question, Map<String, Object> studentAnswer) {
        double maxPoints = 1.0;

        if (studentAnswer == null) return GradeResult.incorrect(maxPoints);

        String textAnswer = studentAnswer.get("textAnswer") != null
                ? String.valueOf(studentAnswer.get("textAnswer")).trim()
                : null;

        if (textAnswer == null || textAnswer.isEmpty()) {
            return GradeResult.incorrect(maxPoints);
        }

        // Get accepted answers from answerKey
        Map<String, Object> answerKey = question.getAnswerKey();
        if (answerKey == null) {
            // Legacy fallback: compare with correctOption
            if (question.getCorrectOption() != null &&
                question.getCorrectOption().equalsIgnoreCase(textAnswer)) {
                return GradeResult.correct(maxPoints);
            }
            return GradeResult.incorrect(maxPoints);
        }

        boolean caseSensitive = Boolean.TRUE.equals(answerKey.get("caseSensitive"));
        Object acceptedObj = answerKey.get("acceptedAnswers");

        if (acceptedObj instanceof List) {
            List<Object> acceptedAnswers = (List<Object>) acceptedObj;
            for (Object accepted : acceptedAnswers) {
                String acceptedStr = String.valueOf(accepted).trim();
                boolean match = caseSensitive
                        ? acceptedStr.equals(textAnswer)
                        : acceptedStr.equalsIgnoreCase(textAnswer);
                if (match) {
                    return GradeResult.correct(maxPoints);
                }
            }
        }

        return GradeResult.incorrect(maxPoints);
    }

    @Override
    public Question.QuestionType getQuestionType() {
        return Question.QuestionType.FILL_IN_BLANK;
    }
}

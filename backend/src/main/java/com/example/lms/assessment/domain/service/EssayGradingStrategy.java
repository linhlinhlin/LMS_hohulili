package com.example.lms.assessment.domain.service;

import com.example.lms.assessment.domain.model.Question;

import java.util.Map;

/**
 * Grading strategy for ESSAY questions.
 * Essays require manual grading - auto-grading returns "pending" result.
 * Reference: Canvas SpeedGrader, Open edX ORA (Open Response Assessment).
 */
public class EssayGradingStrategy implements GradingStrategy {

    @Override
    public GradeResult grade(Question question, Map<String, Object> studentAnswer) {
        double maxPoints = 1.0;

        // Check if answerKey has maxScore override
        if (question.getAnswerKey() != null && question.getAnswerKey().containsKey("maxScore")) {
            Object maxScoreObj = question.getAnswerKey().get("maxScore");
            if (maxScoreObj instanceof Number) {
                maxPoints = ((Number) maxScoreObj).doubleValue();
            }
        }

        // Essays cannot be auto-graded - return pending
        return GradeResult.pendingManualGrading(maxPoints);
    }

    @Override
    public Question.QuestionType getQuestionType() {
        return Question.QuestionType.ESSAY;
    }
}

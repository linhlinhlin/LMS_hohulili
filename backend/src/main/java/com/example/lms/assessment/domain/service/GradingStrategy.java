package com.example.lms.assessment.domain.service;

import com.example.lms.assessment.domain.model.Question;

import java.util.Map;

/**
 * Domain service interface for grading quiz answers.
 * Each QuestionType has its own implementation.
 *
 * Design: Strategy pattern dispatched by QuestionType.
 * Reference: Canvas LMS GradingEngine, Moodle question_type plugins.
 */
public interface GradingStrategy {

    /**
     * Grade a student's answer against the question's answer key.
     *
     * @param question     the question with correct answer data
     * @param studentAnswer the student's submitted answer (flexible JSONB map)
     * @return grading result with score and feedback
     */
    GradeResult grade(Question question, Map<String, Object> studentAnswer);

    /**
     * The question type this strategy handles.
     */
    Question.QuestionType getQuestionType();

    /**
     * Value object representing the result of grading a single question.
     */
    record GradeResult(
        boolean correct,
        double pointsEarned,
        double maxPoints,
        String feedback
    ) {
        public static GradeResult correct(double points) {
            return new GradeResult(true, points, points, null);
        }

        public static GradeResult incorrect(double maxPoints) {
            return new GradeResult(false, 0.0, maxPoints, null);
        }

        public static GradeResult partial(double earned, double maxPoints) {
            return new GradeResult(earned >= maxPoints, earned, maxPoints, null);
        }

        public static GradeResult pendingManualGrading(double maxPoints) {
            return new GradeResult(false, 0.0, maxPoints, "Chờ chấm điểm thủ công");
        }
    }
}

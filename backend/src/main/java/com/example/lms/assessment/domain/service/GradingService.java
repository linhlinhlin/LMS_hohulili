package com.example.lms.assessment.domain.service;

import com.example.lms.assessment.domain.model.Question;

import java.util.EnumMap;
import java.util.Map;

/**
 * Domain service that dispatches grading to the correct strategy based on QuestionType.
 * Pure domain logic - no infrastructure dependencies.
 *
 * Usage: Instantiate once and reuse (strategies are stateless).
 */
public class GradingService {

    private final Map<Question.QuestionType, GradingStrategy> strategies;

    public GradingService() {
        strategies = new EnumMap<>(Question.QuestionType.class);
        register(new SingleChoiceGradingStrategy());
        register(new MultipleChoiceGradingStrategy());
        register(new TrueFalseGradingStrategy());
        register(new FillInBlankGradingStrategy());
        register(new ShortAnswerGradingStrategy());
        register(new EssayGradingStrategy());
    }

    private void register(GradingStrategy strategy) {
        strategies.put(strategy.getQuestionType(), strategy);
    }

    /**
     * Grade a student answer for a question.
     * Dispatches to the appropriate strategy based on question type.
     *
     * @param question      the question (must have questionType set)
     * @param studentAnswer the student's answer as JSONB map
     * @param pointsOverride optional points override from QuizQuestion (null = use default 1.0)
     * @return grade result
     */
    public GradingStrategy.GradeResult grade(Question question, Map<String, Object> studentAnswer, Double pointsOverride) {
        Question.QuestionType type = question.getQuestionType();
        if (type == null) {
            type = Question.QuestionType.SINGLE_CHOICE; // backward compat
        }

        GradingStrategy strategy = strategies.get(type);
        if (strategy == null) {
            throw new IllegalArgumentException("Không có chiến lược chấm điểm cho loại câu hỏi: " + type);
        }

        GradingStrategy.GradeResult result = strategy.grade(question, studentAnswer);

        // Apply points override from QuizQuestion if provided
        if (pointsOverride != null && pointsOverride > 0) {
            double scale = pointsOverride / result.maxPoints();
            return new GradingStrategy.GradeResult(
                    result.correct(),
                    result.pointsEarned() * scale,
                    pointsOverride,
                    result.feedback()
            );
        }

        return result;
    }
}

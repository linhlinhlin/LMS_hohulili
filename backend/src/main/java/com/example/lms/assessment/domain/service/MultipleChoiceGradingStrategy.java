package com.example.lms.assessment.domain.service;

import com.example.lms.assessment.domain.model.Question;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Grading strategy for MULTIPLE_CHOICE questions.
 * Supports partial credit: score = (correct selections - incorrect selections) / total correct.
 * Reference: Canvas LMS partial credit, Moodle "multiple correct" type.
 */
public class MultipleChoiceGradingStrategy implements GradingStrategy {

    @Override
    @SuppressWarnings("unchecked")
    public GradeResult grade(Question question, Map<String, Object> studentAnswer) {
        double maxPoints = 1.0;

        Set<String> correctOptions = resolveCorrectOptions(question);
        Set<String> selectedOptions = resolveSelectedOptions(studentAnswer);

        if (correctOptions.isEmpty() || selectedOptions.isEmpty()) {
            return GradeResult.incorrect(maxPoints);
        }

        // Count correct and incorrect selections
        long correctSelections = selectedOptions.stream()
                .filter(correctOptions::contains)
                .count();
        long incorrectSelections = selectedOptions.stream()
                .filter(s -> !correctOptions.contains(s))
                .count();

        // Partial credit: (correct - incorrect) / total, minimum 0
        double rawScore = (double) (correctSelections - incorrectSelections) / correctOptions.size();
        double score = Math.max(0.0, rawScore) * maxPoints;

        if (score >= maxPoints) {
            return GradeResult.correct(maxPoints);
        } else if (score > 0) {
            return GradeResult.partial(score, maxPoints);
        } else {
            return GradeResult.incorrect(maxPoints);
        }
    }

    @Override
    public Question.QuestionType getQuestionType() {
        return Question.QuestionType.MULTIPLE_CHOICE;
    }

    @SuppressWarnings("unchecked")
    private Set<String> resolveCorrectOptions(Question question) {
        if (question.getAnswerKey() != null && question.getAnswerKey().containsKey("correctOptions")) {
            Object val = question.getAnswerKey().get("correctOptions");
            if (val instanceof List) {
                return ((List<Object>) val).stream()
                        .map(o -> String.valueOf(o).toUpperCase())
                        .collect(Collectors.toSet());
            }
        }
        // Fallback: legacy correctOption with comma-separated values
        if (question.getCorrectOption() != null) {
            return Arrays.stream(question.getCorrectOption().split(","))
                    .map(s -> s.trim().toUpperCase())
                    .collect(Collectors.toSet());
        }
        return Set.of();
    }

    @SuppressWarnings("unchecked")
    private Set<String> resolveSelectedOptions(Map<String, Object> studentAnswer) {
        if (studentAnswer == null) return Set.of();
        // New format: {"selectedOptions": ["A", "C"]}
        Object selected = studentAnswer.get("selectedOptions");
        if (selected instanceof List) {
            return ((List<Object>) selected).stream()
                    .map(o -> String.valueOf(o).toUpperCase())
                    .collect(Collectors.toSet());
        }
        // Legacy: single selectedOption
        Object single = studentAnswer.get("selectedOption");
        if (single != null) {
            return Set.of(String.valueOf(single).toUpperCase());
        }
        return Set.of();
    }
}

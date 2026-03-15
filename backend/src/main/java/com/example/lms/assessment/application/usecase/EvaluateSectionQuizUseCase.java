package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.domain.model.Question;
import com.example.lms.assessment.domain.model.QuizAttempt;
import com.example.lms.assessment.domain.repository.QuestionRepository;
import com.example.lms.assessment.domain.service.GradingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Evaluates embedded section quizzes without requiring a persisted Quiz entity.
 *
 * Section quizzes live inside lesson content blocks, so learner submission is
 * graded directly from referenced questionIds instead of the quiz_attempts flow.
 */
@Service
@RequiredArgsConstructor
public class EvaluateSectionQuizUseCase {

    private final QuestionRepository questionRepository;
    private final GradingService gradingService = new GradingService();

    public record Command(
            List<UUID> questionIds,
            Integer passingScore,
            boolean showResultsImmediately,
            boolean showCorrectAnswers,
            List<QuizAttempt.AttemptAnswer> answers
    ) {}

    public record Result(
            Double score,
            Integer correctAnswers,
            Integer totalQuestions,
            Boolean isPassed,
            List<Map<String, Object>> items,
            String message
    ) {}

    public Result execute(Command command) {
        List<UUID> questionIds = command.questionIds() != null ? command.questionIds() : List.of();
        if (questionIds.isEmpty()) {
            return new Result(0.0, 0, 0, false, List.of(), "Bài kiểm tra chưa có câu hỏi nào.");
        }

        Map<UUID, Question> questionMap = questionRepository.findAllByIds(questionIds).stream()
                .collect(Collectors.toMap(Question::getId, Function.identity()));

        Map<UUID, QuizAttempt.AttemptAnswer> answerMap = new HashMap<>();
        for (QuizAttempt.AttemptAnswer answer : command.answers() != null ? command.answers() : List.<QuizAttempt.AttemptAnswer>of()) {
            if (answer != null && answer.getQuestionId() != null) {
                answerMap.put(answer.getQuestionId(), answer);
            }
        }

        double totalPoints = 0;
        double obtainedPoints = 0;
        int correctAnswers = 0;
        List<Map<String, Object>> fullItems = new ArrayList<>();

        for (UUID questionId : questionIds) {
            Question question = questionMap.get(questionId);
            if (question == null) {
                continue;
            }

            QuizAttempt.AttemptAnswer answer = answerMap.get(questionId);
            Map<String, Object> effectiveAnswer = answer != null ? answer.getEffectiveAnswer() : Map.of();
            var grade = gradingService.grade(question, effectiveAnswer, 1.0);

            totalPoints += grade.maxPoints();
            obtainedPoints += grade.pointsEarned();
            if (grade.correct()) {
                correctAnswers++;
            }

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("questionId", questionId.toString());
            item.put("selectedOption", answer != null ? answer.getSelectedOption() : null);
            item.put("studentAnswer", effectiveAnswer);
            item.put("isCorrect", grade.correct());
            item.put("pointsEarned", grade.pointsEarned());
            item.put("feedback", grade.feedback());
            fullItems.add(item);
        }

        double score = totalPoints > 0 ? (obtainedPoints / totalPoints) * 100.0 : 0.0;
        int passingScore = command.passingScore() != null ? command.passingScore() : 60;
        boolean passed = score >= passingScore;

        if (!command.showResultsImmediately()) {
            return new Result(
                    null,
                    null,
                    questionIds.size(),
                    null,
                    List.of(),
                    "Kết quả sẽ hiển thị khi hệ thống cho phép xem đáp án."
            );
        }

        if (!command.showCorrectAnswers()) {
            List<Map<String, Object>> strippedItems = fullItems.stream()
                    .map(item -> {
                        Map<String, Object> stripped = new LinkedHashMap<>();
                        stripped.put("questionId", item.get("questionId"));
                        stripped.put("selectedOption", item.get("selectedOption"));
                        stripped.put("studentAnswer", item.get("studentAnswer"));
                        stripped.put("feedback", item.get("feedback"));
                        return stripped;
                    })
                    .toList();

            return new Result(score, correctAnswers, questionIds.size(), passed, strippedItems, null);
        }

        return new Result(score, correctAnswers, questionIds.size(), passed, fullItems, null);
    }
}

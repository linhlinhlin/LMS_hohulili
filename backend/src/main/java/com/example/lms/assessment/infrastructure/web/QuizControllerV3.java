package com.example.lms.assessment.infrastructure.web;

import com.example.lms.assessment.application.usecase.CreateQuizUseCaseV3;
import com.example.lms.assessment.application.usecase.QuizAttemptUseCase;
import com.example.lms.assessment.application.usecase.QuizManagementUseCase;
import com.example.lms.assessment.domain.model.Quiz;
import com.example.lms.assessment.domain.model.QuizAttempt;
import com.example.lms.assessment.infrastructure.persistence.entity.QuestionJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.QuizAttemptJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.QuizJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.QuestionJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizAttemptJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizJpaRepositoryV3;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.domain.model.ContentBlock;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v3/quizzes")
@RequiredArgsConstructor
@Tag(name = "Quiz V3", description = "Quiz Management and Attempts (V3)")
public class QuizControllerV3 {

    private final CreateQuizUseCaseV3 createQuizUseCase;
    private final QuizManagementUseCase quizManagementUseCase;
    private final QuizAttemptUseCase quizAttemptUseCase;
    private final QuestionJpaRepository questionJpaRepository;
    private final QuizJpaRepositoryV3 quizJpaRepository;
    private final QuizAttemptJpaRepository attemptJpaRepository;

    // ============ Teacher CRUD Operations ============

    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Create a new quiz")
    public ResponseEntity<ApiResponse<UUID>> createQuiz(@RequestBody @Valid CreateQuizUseCaseV3.CreateQuizCommand command) {
        UUID quizId = createQuizUseCase.execute(command);
        return ResponseEntity.ok(ApiResponse.success(quizId));
    }

    @GetMapping("/{quizId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN', 'STUDENT')")
    @Operation(summary = "Get quiz by ID")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getQuizById(@PathVariable UUID quizId) {
        Quiz quiz = quizManagementUseCase.getQuizById(quizId);
        return ResponseEntity.ok(ApiResponse.success(toQuizMap(quiz)));
    }

    @GetMapping("/lessons/{lessonId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN', 'STUDENT')")
    @Operation(summary = "Get quizzes for a lesson")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getQuizzesByLesson(@PathVariable UUID lessonId) {
        List<Quiz> quizzes = quizManagementUseCase.getQuizzesByLesson(lessonId);
        return ResponseEntity.ok(ApiResponse.success(quizzes.stream().map(this::toQuizMap).toList()));
    }

    @GetMapping("/{quizId}/questions")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN', 'STUDENT')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get quiz questions with full details")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getQuizQuestions(@PathVariable UUID quizId) {
        Quiz quiz = quizManagementUseCase.getQuizById(quizId);
        List<UUID> questionIds = quiz.getQuestions() != null
                ? quiz.getQuestions().stream().map(q -> q.getQuestionId()).toList()
                : List.of();

        if (questionIds.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(List.of()));
        }

        var questions = questionJpaRepository.findAllById(questionIds);
        List<Map<String, Object>> result = questions.stream().map(this::toQuestionMap).toList();
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping("/{quizId}/questions")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Add a question to a quiz")
    public ResponseEntity<ApiResponse<Void>> addQuestion(
            @PathVariable UUID quizId,
            @Valid @RequestBody AddQuestionRequest request) {
        quizManagementUseCase.addQuestionToQuiz(quizId, request.questionId(), request.displayOrder());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @DeleteMapping("/{quizId}/questions/{questionId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Remove a question from a quiz")
    public ResponseEntity<ApiResponse<Void>> removeQuestion(
            @PathVariable UUID quizId,
            @PathVariable UUID questionId) {
        quizManagementUseCase.removeQuestionFromQuiz(quizId, questionId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PutMapping("/{quizId}/settings")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Update quiz settings")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateQuizSettings(
            @PathVariable UUID quizId,
            @Valid @RequestBody UpdateQuizSettingsRequest request) {
        Quiz.QuizSettings newSettings = Quiz.QuizSettings.builder()
                .timeLimitMinutes(request.timeLimitMinutes())
                .maxAttempts(request.maxAttempts())
                .passingScore(request.passingScore())
                .shuffleQuestions(request.shuffleQuestions())
                .shuffleOptions(request.shuffleOptions())
                .showResultsImmediately(request.showResultsImmediately())
                .showCorrectAnswers(request.showCorrectAnswers())
                .build();
        Quiz updated = quizManagementUseCase.updateQuizSettings(quizId, newSettings, request.title());
        return ResponseEntity.ok(ApiResponse.success(toQuizMap(updated), "Quiz settings updated"));
    }

    @PutMapping("/{quizId}/questions")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Transactional
    @Operation(summary = "Update quiz questions (bulk replace)")
    public ResponseEntity<ApiResponse<Void>> updateQuizQuestions(
            @PathVariable UUID quizId,
            @Valid @RequestBody UpdateQuizQuestionsRequest request) {
        // Pragmatic: use JPA directly to replace quiz_questions join entries
        var quizEntity = quizJpaRepository.findById(quizId)
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Quiz", quizId));

        // Must clear() and addAll() - never replace the collection reference (Hibernate orphan error)
        if (quizEntity.getQuestions() == null) {
            quizEntity.setQuestions(new java.util.ArrayList<>());
        }
        quizEntity.getQuestions().clear();

        // Add new questions
        for (int i = 0; i < request.questionIds().size(); i++) {
            var qq = com.example.lms.assessment.infrastructure.persistence.entity.QuizQuestionJpaEntity.builder()
                    .quiz(quizEntity)
                    .questionId(request.questionIds().get(i))
                    .displayOrder(i)
                    .points(1)
                    .build();
            quizEntity.getQuestions().add(qq);
        }
        quizJpaRepository.save(quizEntity);

        return ResponseEntity.ok(ApiResponse.success(null, "Quiz questions updated"));
    }

    @PostMapping("/{quizId}/publish")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Publish a quiz")
    public ResponseEntity<ApiResponse<Void>> publishQuiz(@PathVariable UUID quizId) {
        quizManagementUseCase.publishQuiz(quizId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/teacher/quizzes")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get teacher's quizzes")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getTeacherQuizzes(
            @AuthenticationPrincipal UserJpaEntity user) {
        // Single native query — avoids N+1 and Hibernate 6.4 UUID batch loading bug
        var quizEntities = quizJpaRepository.findAllByTeacherId(user.getId());
        List<Map<String, Object>> result = quizEntities.stream()
                .map(this::toQuizEntityMap)
                .collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    // ============ Student Operations ============

    @PostMapping("/{quizId}/attempts/start")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Start a quiz attempt")
    public ResponseEntity<ApiResponse<QuizAttempt>> startAttempt(
            @PathVariable UUID quizId,
            @AuthenticationPrincipal UserJpaEntity user) {
        UUID studentId = user.getId();
        QuizAttempt attempt = quizAttemptUseCase.startAttempt(quizId, studentId);
        return ResponseEntity.ok(ApiResponse.success(attempt));
    }

    @PostMapping("/attempts/{attemptId}/submit")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Submit a quiz attempt")
    public ResponseEntity<ApiResponse<QuizAttempt>> submitAttempt(
            @PathVariable UUID attemptId,
            @Valid @RequestBody List<QuizAttempt.AttemptAnswer> answers) {
        try {
            QuizAttempt result = quizAttemptUseCase.submitAttempt(attemptId, answers);
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (org.springframework.dao.OptimisticLockingFailureException e) {
            return ResponseEntity.status(409)
                    .body(ApiResponse.error("Bài thi đã được nộp. Vui lòng không nộp lại."));
        }
    }

    @GetMapping("/attempts/{attemptId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER')")
    @Operation(summary = "Get attempt result")
    public ResponseEntity<ApiResponse<QuizAttempt>> getAttempt(
            @PathVariable UUID attemptId,
            @AuthenticationPrincipal UserJpaEntity user) {
        QuizAttempt result = quizAttemptUseCase.getAttemptResult(attemptId);
        // SOTA (Canvas/Moodle): Students can only view their own attempts
        if (user.getRole() == UserJpaEntity.UserRole.STUDENT
                && !result.getStudentId().equals(user.getId())) {
            return ResponseEntity.status(403)
                    .body(ApiResponse.error("You can only view your own quiz attempts"));
        }
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    // ============ Quiz Attempts & Statistics (Teacher View) ============

    @GetMapping("/{quizId}/attempts")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Get quiz attempts")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getQuizAttempts(
            @PathVariable UUID quizId,
            @AuthenticationPrincipal UserJpaEntity user) {
        List<QuizAttemptJpaEntity> attempts;
        if (user.getRole() == UserJpaEntity.UserRole.STUDENT) {
            // Students can only see their own attempts
            attempts = attemptJpaRepository.findByQuizIdAndStudentId(quizId, user.getId());
        } else {
            attempts = attemptJpaRepository.findByQuizIdOrderByCreatedAtDesc(quizId);
        }
        List<Map<String, Object>> result = attempts.stream().map(this::toAttemptMap).toList();
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/lessons/{lessonId}/attempts")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get all attempts for a lesson's quizzes")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getLessonAttempts(@PathVariable UUID lessonId) {
        var quizzes = quizJpaRepository.findByLessonId(lessonId);
        List<UUID> quizIds = quizzes.stream().map(QuizJpaEntity::getId).toList();
        if (quizIds.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(List.of()));
        }
        var attempts = attemptJpaRepository.findByQuizIdInOrderByCreatedAtDesc(quizIds);
        List<Map<String, Object>> result = attempts.stream().map(this::toAttemptMap).toList();
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/lessons/{lessonId}/statistics")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get quiz statistics for a lesson")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getQuizStatistics(@PathVariable UUID lessonId) {
        var quizzes = quizJpaRepository.findByLessonId(lessonId);
        if (quizzes.isEmpty()) {
            Map<String, Object> empty = new HashMap<>();
            empty.put("totalAttempts", 0);
            empty.put("completedAttempts", 0);
            empty.put("averageScore", 0.0);
            empty.put("passRate", 0.0);
            return ResponseEntity.ok(ApiResponse.success(empty));
        }

        List<UUID> quizIds = quizzes.stream().map(QuizJpaEntity::getId).toList();
        var attempts = attemptJpaRepository.findByQuizIdInOrderByCreatedAtDesc(quizIds);

        int totalAttempts = attempts.size();
        long completedAttempts = attempts.stream()
                .filter(a -> a.getStatus() == QuizAttemptJpaEntity.AttemptStatus.GRADED
                        || a.getStatus() == QuizAttemptJpaEntity.AttemptStatus.SUBMITTED)
                .count();
        double avgScore = attempts.stream()
                .filter(a -> a.getScore() != null)
                .mapToDouble(QuizAttemptJpaEntity::getScore)
                .average().orElse(0);

        int passingScore = quizzes.get(0).getPassingScore() != null ? quizzes.get(0).getPassingScore() : 60;
        long passedAttempts = attempts.stream()
                .filter(a -> a.getScore() != null && a.getScore() >= passingScore)
                .count();
        double passRate = totalAttempts > 0 ? (double) passedAttempts / totalAttempts * 100 : 0;

        Map<String, Object> stats = new HashMap<>();
        stats.put("quizId", quizzes.get(0).getId().toString());
        stats.put("quizTitle", quizzes.get(0).getTitle());
        stats.put("totalAttempts", totalAttempts);
        stats.put("completedAttempts", completedAttempts);
        stats.put("averageScore", Math.round(avgScore * 10) / 10.0);
        stats.put("passRate", Math.round(passRate * 10) / 10.0);
        stats.put("passingScore", passingScore);

        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    // ============ Helper Methods ============

    private Map<String, Object> toQuizMap(Quiz quiz) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", quiz.getId().value().toString());
        map.put("lessonId", quiz.getLessonId().toString());
        map.put("title", quiz.getTitle());
        map.put("description", quiz.getDescription());
        map.put("timeLimitMinutes", quiz.getSettings().timeLimitMinutes());
        map.put("maxAttempts", quiz.getSettings().maxAttempts());
        map.put("passingScore", quiz.getSettings().passingScore());
        map.put("shuffleQuestions", quiz.getSettings().shuffleQuestions());
        map.put("shuffleOptions", quiz.getSettings().shuffleOptions());
        map.put("showResultsImmediately", quiz.getSettings().showResultsImmediately());
        map.put("showCorrectAnswers", quiz.getSettings().showCorrectAnswers());
        map.put("status", quiz.getStatus().name());
        map.put("questionCount", quiz.getQuestions() != null ? quiz.getQuestions().size() : 0);
        map.put("createdAt", quiz.getCreatedAt() != null ? quiz.getCreatedAt().toString() : null);
        map.put("updatedAt", quiz.getUpdatedAt() != null ? quiz.getUpdatedAt().toString() : null);
        return map;
    }

    private Map<String, Object> toQuizEntityMap(QuizJpaEntity entity) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", entity.getId().toString());
        map.put("lessonId", entity.getLessonId().toString());
        map.put("title", entity.getTitle());
        map.put("description", entity.getDescription());
        map.put("timeLimitMinutes", entity.getTimeLimitMinutes());
        map.put("maxAttempts", entity.getMaxAttempts());
        map.put("passingScore", entity.getPassingScore());
        map.put("shuffleQuestions", entity.getShuffleQuestions());
        map.put("shuffleOptions", entity.getShuffleOptions());
        map.put("showResultsImmediately", entity.getShowResultsImmediately());
        map.put("showCorrectAnswers", entity.getShowCorrectAnswers());
        map.put("status", entity.getStatus().name());
        // Safety: catch Hibernate 6.4 UUID batch loading bug when accessing questions collection
        int questionCount = 0;
        try {
            questionCount = entity.getQuestions() != null ? entity.getQuestions().size() : 0;
        } catch (ClassCastException | org.hibernate.HibernateException e) {
            log.debug("Could not fetch question count for quiz {}: {}", entity.getId(), e.getMessage());
        }
        map.put("questionCount", questionCount);
        map.put("createdAt", entity.getCreatedAt() != null ? entity.getCreatedAt().toString() : null);
        map.put("updatedAt", entity.getUpdatedAt() != null ? entity.getUpdatedAt().toString() : null);
        return map;
    }

    private Map<String, Object> toQuestionMap(QuestionJpaEntity q) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", q.getId().toString());
        map.put("content", extractTextFromBlocks(q.getContentBlocks()));
        map.put("contentBlocks", q.getContentBlocks());
        map.put("questionType", q.getQuestionType() != null ? q.getQuestionType().name() : "SINGLE_CHOICE");
        map.put("correctOption", q.getCorrectOption());
        map.put("answerKey", q.getAnswerKey());
        map.put("difficulty", q.getDifficulty() != null ? q.getDifficulty().name() : "MEDIUM");
        map.put("tags", q.getTags());
        map.put("status", q.getStatus() != null ? q.getStatus().name() : "ACTIVE");
        map.put("usageCount", q.getUsageCount());
        map.put("correctRate", q.getCorrectRate());
        map.put("createdAt", q.getCreatedAt() != null ? q.getCreatedAt().toString() : null);
        map.put("updatedAt", q.getUpdatedAt() != null ? q.getUpdatedAt().toString() : null);

        if (q.getOptions() != null) {
            var options = q.getOptions().stream().map(opt -> {
                Map<String, Object> optMap = new HashMap<>();
                optMap.put("id", opt.getId() != null ? opt.getId().toString() : null);
                optMap.put("optionKey", opt.getKey());
                optMap.put("content", extractTextFromBlocks(opt.getContentBlocks()));
                optMap.put("contentBlocks", opt.getContentBlocks());
                optMap.put("displayOrder", opt.getOrderIndex());
                return (Map<String, Object>) optMap;
            }).toList();
            map.put("options", options);
        }
        return map;
    }

    private Map<String, Object> toAttemptMap(QuizAttemptJpaEntity a) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", a.getId().toString());
        map.put("quizId", a.getQuizId().toString());
        map.put("studentId", a.getStudentId().toString());
        map.put("status", a.getStatus().name());
        map.put("score", a.getScore());
        map.put("maxScore", a.getMaxScore());
        map.put("startTime", a.getStartedAt() != null ? a.getStartedAt().toString() : null);
        map.put("endTime", a.getSubmittedAt() != null ? a.getSubmittedAt().toString() : null);
        map.put("createdAt", a.getCreatedAt() != null ? a.getCreatedAt().toString() : null);
        return map;
    }

    private String extractTextFromBlocks(List<ContentBlock> blocks) {
        if (blocks == null || blocks.isEmpty()) return "";
        StringBuilder sb = new StringBuilder();
        for (var block : blocks) {
            if (block.getData() != null) {
                Object text = block.getData().get("text");
                if (text != null) {
                    if (!sb.isEmpty()) sb.append(" ");
                    sb.append(text.toString());
                }
            }
        }
        return sb.toString();
    }

    // ============ Request DTOs ============

    public record AddQuestionRequest(
            @NotNull(message = "Question ID is required")
            UUID questionId,
            @NotNull(message = "Display order is required")
            @PositiveOrZero(message = "Display order must be non-negative")
            Integer displayOrder
    ) {}

    public record UpdateQuizSettingsRequest(
            String title,
            Integer timeLimitMinutes,
            Integer maxAttempts,
            Integer passingScore,
            Boolean shuffleQuestions,
            Boolean shuffleOptions,
            Boolean showResultsImmediately,
            Boolean showCorrectAnswers
    ) {}

    public record UpdateQuizQuestionsRequest(
            @NotNull(message = "Question IDs are required")
            List<UUID> questionIds
    ) {}
}

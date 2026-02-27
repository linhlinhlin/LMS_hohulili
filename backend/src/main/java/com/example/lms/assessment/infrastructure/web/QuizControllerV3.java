package com.example.lms.assessment.infrastructure.web;

import com.example.lms.assessment.application.usecase.CreateQuizUseCaseV3;
import com.example.lms.assessment.application.usecase.GetQuizStatisticsUseCase;
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
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.domain.model.ContentBlock;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
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
    private final GetQuizStatisticsUseCase getQuizStatisticsUseCase;
    private final QuestionJpaRepository questionJpaRepository;
    private final QuizJpaRepositoryV3 quizJpaRepository;
    private final QuizAttemptJpaRepository attemptJpaRepository;
    private final JpaCourseRepository courseJpaRepository;

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
    public ResponseEntity<ApiResponse<Map<String, Object>>> getQuizById(
            @PathVariable UUID quizId,
            @AuthenticationPrincipal UserJpaEntity user) {
        Quiz quiz = quizManagementUseCase.getQuizById(quizId);
        // P0: Teachers can only see their own quizzes
        if (user.getRole() != UserJpaEntity.UserRole.STUDENT) {
            verifyLessonOwnership(quiz.getLessonId(), user);
        }
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
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getQuizQuestions(
            @PathVariable UUID quizId,
            @AuthenticationPrincipal UserJpaEntity user) {
        Quiz quiz = quizManagementUseCase.getQuizById(quizId);
        // P0: Teachers can only see questions for their own quizzes
        if (user.getRole() != UserJpaEntity.UserRole.STUDENT) {
            verifyLessonOwnership(quiz.getLessonId(), user);
        }
        List<UUID> questionIds = quiz.getQuestions() != null
                ? quiz.getQuestions().stream().map(q -> q.getQuestionId()).toList()
                : List.of();

        if (questionIds.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(List.of()));
        }

        var questions = questionJpaRepository.findAllById(questionIds);
        boolean isStudent = user.getRole() == UserJpaEntity.UserRole.STUDENT;
        List<Map<String, Object>> result = questions.stream()
                .map(q -> isStudent ? toStudentQuestionMap(q) : toQuestionMap(q))
                .toList();
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping("/{quizId}/questions")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Add a question to a quiz")
    public ResponseEntity<ApiResponse<Void>> addQuestion(
            @PathVariable UUID quizId,
            @Valid @RequestBody AddQuestionRequest request,
            @AuthenticationPrincipal UserJpaEntity user) {
        quizManagementUseCase.addQuestionToQuiz(quizId, request.questionId(), request.displayOrder(),
                user.getId(), user.getRole().name());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @DeleteMapping("/{quizId}/questions/{questionId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Remove a question from a quiz")
    public ResponseEntity<ApiResponse<Void>> removeQuestion(
            @PathVariable UUID quizId,
            @PathVariable UUID questionId,
            @AuthenticationPrincipal UserJpaEntity user) {
        quizManagementUseCase.removeQuestionFromQuiz(quizId, questionId,
                user.getId(), user.getRole().name());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PutMapping("/{quizId}/settings")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Update quiz settings")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateQuizSettings(
            @PathVariable UUID quizId,
            @Valid @RequestBody UpdateQuizSettingsRequest request,
            @AuthenticationPrincipal UserJpaEntity user) {
        Instant availableFrom = null, dueAt = null, lockAt = null;
        try {
            if (request.availableFrom() != null) availableFrom = Instant.parse(request.availableFrom());
            if (request.dueAt() != null) dueAt = Instant.parse(request.dueAt());
            if (request.lockAt() != null) lockAt = Instant.parse(request.lockAt());
        } catch (java.time.format.DateTimeParseException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Định dạng thời gian không hợp lệ: " + e.getMessage()));
        }
        Quiz.QuizSettings newSettings = Quiz.QuizSettings.builder()
                .timeLimitMinutes(request.timeLimitMinutes())
                .maxAttempts(request.maxAttempts())
                .passingScore(request.passingScore())
                .shuffleQuestions(request.shuffleQuestions())
                .shuffleOptions(request.shuffleOptions())
                .showResultsImmediately(request.showResultsImmediately())
                .showCorrectAnswers(request.showCorrectAnswers())
                .availableFrom(availableFrom)
                .dueAt(dueAt)
                .lockAt(lockAt)
                .build();
        Quiz updated = quizManagementUseCase.updateQuizSettings(quizId, newSettings, request.title(),
                user.getId(), user.getRole().name());
        return ResponseEntity.ok(ApiResponse.success(toQuizMap(updated), "Cập nhật cài đặt bài kiểm tra"));
    }

    @PutMapping("/{quizId}/questions")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Transactional
    @Operation(summary = "Update quiz questions (bulk replace)")
    public ResponseEntity<ApiResponse<Void>> updateQuizQuestions(
            @PathVariable UUID quizId,
            @Valid @RequestBody UpdateQuizQuestionsRequest request,
            @AuthenticationPrincipal UserJpaEntity user) {
        // Pragmatic: use JPA directly to replace quiz_questions join entries
        var quizEntity = quizJpaRepository.findById(quizId)
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Quiz", quizId));

        // P0: Verify teacher owns the course this quiz belongs to
        verifyQuizOwnership(quizEntity, user);

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

        return ResponseEntity.ok(ApiResponse.success(null, "Cập nhật câu hỏi bài kiểm tra"));
    }

    @PostMapping("/{quizId}/publish")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Publish a quiz")
    public ResponseEntity<ApiResponse<Void>> publishQuiz(
            @PathVariable UUID quizId,
            @AuthenticationPrincipal UserJpaEntity user) {
        quizManagementUseCase.publishQuiz(quizId, user.getId(), user.getRole().name());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @DeleteMapping("/{quizId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Delete a quiz")
    public ResponseEntity<ApiResponse<Void>> deleteQuiz(
            @PathVariable UUID quizId,
            @AuthenticationPrincipal UserJpaEntity user) {
        quizManagementUseCase.deleteQuiz(quizId, user.getId(), user.getRole().name());
        return ResponseEntity.ok(ApiResponse.success(null, "Xóa bài kiểm tra thành công"));
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
            @Valid @RequestBody List<QuizAttempt.AttemptAnswer> answers,
            @AuthenticationPrincipal UserJpaEntity user) {
        // P0: Verify student owns this attempt
        var attemptEntity = attemptJpaRepository.findById(attemptId)
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("QuizAttempt", attemptId));
        if (!attemptEntity.getStudentId().equals(user.getId())) {
            return ResponseEntity.status(403)
                    .body(ApiResponse.error("Bạn không có quyền nộp bài thi này"));
        }
        try {
            QuizAttempt result = quizAttemptUseCase.submitAttempt(attemptId, answers);
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (org.springframework.dao.OptimisticLockingFailureException e) {
            return ResponseEntity.status(409)
                    .body(ApiResponse.error("Bài thi đã được nộp. Vui lòng không nộp lại."));
        }
    }

    // Phase 4: Auto-save endpoint (Moodle SOTA: saves answers every 60s)
    @PutMapping("/attempts/{attemptId}/save")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Auto-save quiz attempt progress")
    public ResponseEntity<ApiResponse<Void>> saveAttemptProgress(
            @PathVariable UUID attemptId,
            @Valid @RequestBody List<QuizAttempt.AttemptAnswer> answers,
            @AuthenticationPrincipal UserJpaEntity user) {
        try {
            quizAttemptUseCase.saveProgress(attemptId, user.getId(), answers);
            return ResponseEntity.ok(ApiResponse.success(null, "Đã lưu tiến trình"));
        } catch (org.springframework.dao.OptimisticLockingFailureException e) {
            return ResponseEntity.status(409)
                    .body(ApiResponse.error("Dữ liệu đã thay đổi, vui lòng thử lại"));
        }
    }

    // Phase 1: Answer visibility enforcement (Canvas SOTA: gated by quiz settings)
    @GetMapping("/attempts/{attemptId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Get attempt result")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAttempt(
            @PathVariable UUID attemptId,
            @AuthenticationPrincipal UserJpaEntity user) {
        QuizAttempt attempt = quizAttemptUseCase.getAttemptResult(attemptId, user.getId(), user.getRole().name());

        // Teachers/Admins always see full data
        boolean isStudent = user.getRole() == UserJpaEntity.UserRole.STUDENT;
        if (!isStudent) {
            return ResponseEntity.ok(ApiResponse.success(toFullAttemptResultMap(attempt)));
        }

        // Student: gate response by quiz settings
        Quiz quiz = quizManagementUseCase.getQuizById(attempt.getQuizId());
        return ResponseEntity.ok(ApiResponse.success(toGatedAttemptResultMap(attempt, quiz)));
    }

    // Phase 2: Manual grading endpoint (Canvas SOTA: PUT /submissions/:id/questions/:qid)
    @PatchMapping("/attempts/{attemptId}/grade")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Manually grade a question in an attempt (essay grading)")
    public ResponseEntity<ApiResponse<Map<String, Object>>> manualGradeQuestion(
            @PathVariable UUID attemptId,
            @Valid @RequestBody ManualGradeRequest request,
            @AuthenticationPrincipal UserJpaEntity user) {
        QuizAttempt graded = quizAttemptUseCase.manualGrade(
                attemptId, request.questionId(), request.score(), request.feedback(),
                user.getId(), user.getRole().name());
        return ResponseEntity.ok(ApiResponse.success(toFullAttemptResultMap(graded), "Đã chấm điểm"));
    }

    // ============ Quiz Attempts & Statistics (Teacher View) ============

    // Phase 5: Paginated attempt lists (Canvas SOTA: page + per_page)
    @GetMapping("/{quizId}/attempts")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Get quiz attempts (paginated)")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getQuizAttempts(
            @PathVariable UUID quizId,
            @AuthenticationPrincipal UserJpaEntity user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        boolean isStudent = user.getRole() == UserJpaEntity.UserRole.STUDENT;
        if (isStudent) {
            // Students can only see their own attempts (not paginated — bounded by maxAttempts)
            var attempts = attemptJpaRepository.findByQuizIdAndStudentId(quizId, user.getId());
            return ResponseEntity.ok(ApiResponse.success(Map.of(
                    "content", attempts.stream().map(this::toAttemptMap).toList(),
                    "page", 0, "size", attempts.size(),
                    "totalElements", attempts.size(), "totalPages", 1)));
        }

        // P0: Teacher can only see attempts for quizzes they own
        var quizEntity = quizJpaRepository.findById(quizId)
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Quiz", quizId));
        verifyQuizOwnership(quizEntity, user);

        Page<QuizAttemptJpaEntity> attemptPage = attemptJpaRepository
                .findByQuizIdOrderByCreatedAtDesc(quizId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(toPaginatedMap(attemptPage)));
    }

    @GetMapping("/lessons/{lessonId}/attempts")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get all attempts for a lesson's quizzes (paginated)")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getLessonAttempts(
            @PathVariable UUID lessonId,
            @AuthenticationPrincipal UserJpaEntity user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        // P0: Verify teacher owns the lesson's course
        verifyLessonOwnership(lessonId, user);
        var quizzes = quizJpaRepository.findByLessonId(lessonId);
        List<UUID> quizIds = quizzes.stream().map(QuizJpaEntity::getId).toList();
        if (quizIds.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(Map.of(
                    "content", List.of(), "page", 0, "size", 0,
                    "totalElements", 0L, "totalPages", 0)));
        }
        Page<QuizAttemptJpaEntity> attemptPage = attemptJpaRepository
                .findByQuizIdInOrderByCreatedAtDesc(quizIds, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(toPaginatedMap(attemptPage)));
    }

    @GetMapping("/lessons/{lessonId}/statistics")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Get quiz statistics for a lesson")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getQuizStatistics(
            @PathVariable UUID lessonId,
            @AuthenticationPrincipal UserJpaEntity user) {
        // P0: Verify teacher owns the lesson's course
        verifyLessonOwnership(lessonId, user);
        Map<String, Object> stats = getQuizStatisticsUseCase.execute(lessonId);
        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    // Phase 5: Paginated student attempts
    @GetMapping("/student/my-attempts")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Get all quiz attempts for current student (paginated)")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMyAttempts(
            @AuthenticationPrincipal UserJpaEntity user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<QuizAttemptJpaEntity> attemptPage = attemptJpaRepository
                .findByStudentIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(toPaginatedMap(attemptPage)));
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
        map.put("availableFrom", quiz.getSettings().availableFrom() != null ? quiz.getSettings().availableFrom().toString() : null);
        map.put("dueAt", quiz.getSettings().dueAt() != null ? quiz.getSettings().dueAt().toString() : null);
        map.put("lockAt", quiz.getSettings().lockAt() != null ? quiz.getSettings().lockAt().toString() : null);
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
        map.put("availableFrom", entity.getAvailableFrom() != null ? entity.getAvailableFrom().toString() : null);
        map.put("dueAt", entity.getDueAt() != null ? entity.getDueAt().toString() : null);
        map.put("lockAt", entity.getLockAt() != null ? entity.getLockAt().toString() : null);
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

    /**
     * Question map for STUDENT role — strips correctOption, answerKey, correctRate
     * to prevent answer key leakage before submission.
     */
    private Map<String, Object> toStudentQuestionMap(QuestionJpaEntity q) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", q.getId().toString());
        map.put("content", extractTextFromBlocks(q.getContentBlocks()));
        map.put("contentBlocks", q.getContentBlocks());
        map.put("questionType", q.getQuestionType() != null ? q.getQuestionType().name() : "SINGLE_CHOICE");
        map.put("difficulty", q.getDifficulty() != null ? q.getDifficulty().name() : "MEDIUM");
        map.put("tags", q.getTags());
        map.put("status", q.getStatus() != null ? q.getStatus().name() : "ACTIVE");
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
        map.put("isPassed", a.getIsPassed());
        map.put("startTime", a.getStartedAt() != null ? a.getStartedAt().toString() : null);
        map.put("endTime", a.getSubmittedAt() != null ? a.getSubmittedAt().toString() : null);
        map.put("createdAt", a.getCreatedAt() != null ? a.getCreatedAt().toString() : null);
        return map;
    }

    /**
     * Phase 1: Full attempt result (for teachers/admins — always includes all grading data).
     */
    private Map<String, Object> toFullAttemptResultMap(QuizAttempt attempt) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", attempt.getId().toString());
        map.put("quizId", attempt.getQuizId().toString());
        map.put("studentId", attempt.getStudentId().toString());
        map.put("status", attempt.getStatus().name());
        map.put("score", attempt.getScore());
        map.put("isPassed", attempt.getIsPassed());
        map.put("startTime", attempt.getStartTime() != null ? attempt.getStartTime().toString() : null);
        map.put("endTime", attempt.getEndTime() != null ? attempt.getEndTime().toString() : null);
        map.put("items", attempt.getItems().stream().map(this::toFullItemMap).toList());
        return map;
    }

    /**
     * Phase 1: Gated attempt result for students — respects showResultsImmediately and showCorrectAnswers.
     */
    private Map<String, Object> toGatedAttemptResultMap(QuizAttempt attempt, Quiz quiz) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", attempt.getId().toString());
        map.put("quizId", attempt.getQuizId().toString());
        map.put("studentId", attempt.getStudentId().toString());
        map.put("status", attempt.getStatus().name());
        map.put("startTime", attempt.getStartTime() != null ? attempt.getStartTime().toString() : null);
        map.put("endTime", attempt.getEndTime() != null ? attempt.getEndTime().toString() : null);

        boolean showResults = Boolean.TRUE.equals(quiz.getSettings().showResultsImmediately());
        boolean showCorrect = Boolean.TRUE.equals(quiz.getSettings().showCorrectAnswers());

        if (!showResults) {
            // Hide score and items entirely until teacher reviews
            map.put("score", null);
            map.put("isPassed", null);
            map.put("items", List.of());
            map.put("message", "Kết quả sẽ được hiển thị sau khi giáo viên xem xét");
        } else {
            map.put("score", attempt.getScore());
            map.put("isPassed", attempt.getIsPassed());
            if (showCorrect) {
                // Full item details including isCorrect
                map.put("items", attempt.getItems().stream().map(this::toFullItemMap).toList());
            } else {
                // Items WITHOUT isCorrect and pointsEarned — student sees their answers but not correctness
                map.put("items", attempt.getItems().stream().map(this::toStrippedItemMap).toList());
            }
        }
        return map;
    }

    private Map<String, Object> toFullItemMap(QuizAttempt.AttemptItem item) {
        Map<String, Object> map = new HashMap<>();
        map.put("questionId", item.getQuestionId().toString());
        map.put("selectedOption", item.getSelectedOption());
        map.put("studentAnswer", item.getStudentAnswer());
        map.put("isCorrect", item.getIsCorrect());
        map.put("pointsEarned", item.getPointsEarned());
        map.put("feedback", item.getFeedback());
        return map;
    }

    /**
     * Stripped item map — student sees their answer but NOT isCorrect/pointsEarned.
     */
    private Map<String, Object> toStrippedItemMap(QuizAttempt.AttemptItem item) {
        Map<String, Object> map = new HashMap<>();
        map.put("questionId", item.getQuestionId().toString());
        map.put("selectedOption", item.getSelectedOption());
        map.put("studentAnswer", item.getStudentAnswer());
        map.put("feedback", item.getFeedback());
        // Intentionally omit isCorrect and pointsEarned
        return map;
    }

    private Map<String, Object> toPaginatedMap(Page<QuizAttemptJpaEntity> page) {
        Map<String, Object> result = new HashMap<>();
        result.put("content", page.getContent().stream().map(this::toAttemptMap).toList());
        result.put("page", page.getNumber());
        result.put("size", page.getSize());
        result.put("totalElements", page.getTotalElements());
        result.put("totalPages", page.getTotalPages());
        return result;
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
            @NotNull(message = "Mã câu hỏi không được để trống")
            UUID questionId,
            @NotNull(message = "Thứ tự hiển thị không được để trống")
            @PositiveOrZero(message = "Thứ tự hiển thị không được âm")
            Integer displayOrder
    ) {}

    public record UpdateQuizSettingsRequest(
            String title,
            @Min(value = 1, message = "Thời gian giới hạn phải lớn hơn 0")
            Integer timeLimitMinutes,
            @Min(value = 1, message = "Số lần làm bài tối đa phải lớn hơn 0")
            Integer maxAttempts,
            @Min(value = 0, message = "Điểm đạt không được âm")
            @Max(value = 100, message = "Điểm đạt không được vượt quá 100")
            Integer passingScore,
            Boolean shuffleQuestions,
            Boolean shuffleOptions,
            Boolean showResultsImmediately,
            Boolean showCorrectAnswers,
            String availableFrom,
            String dueAt,
            String lockAt
    ) {}

    public record UpdateQuizQuestionsRequest(
            @NotNull(message = "Danh sách mã câu hỏi không được để trống")
            List<UUID> questionIds
    ) {}

    public record ManualGradeRequest(
            @NotNull(message = "Mã câu hỏi không được để trống")
            UUID questionId,
            @NotNull(message = "Điểm không được để trống")
            @PositiveOrZero(message = "Điểm không được âm")
            @DecimalMax(value = "100.0", message = "Điểm không được vượt quá 100")
            Double score,
            String feedback
    ) {}

    // ============ Ownership Helpers ============

    private boolean isAdminRole(UserJpaEntity user) {
        return user.getRole() == UserJpaEntity.UserRole.ADMIN
            || user.getRole() == UserJpaEntity.UserRole.ORG_ADMIN;
    }

    private void verifyLessonOwnership(UUID lessonId, UserJpaEntity user) {
        if (isAdminRole(user)) return;
        courseJpaRepository.findByLessonId(lessonId).ifPresentOrElse(
            course -> {
                if (course.getTeacherId() == null || !course.getTeacherId().equals(user.getId())) {
                    throw new org.springframework.security.access.AccessDeniedException("Bạn không sở hữu tài nguyên này");
                }
            },
            () -> { throw new com.example.lms.shared.exception.EntityNotFoundException("Course for lesson", lessonId); }
        );
    }

    private void verifyQuizOwnership(QuizJpaEntity quiz, UserJpaEntity user) {
        if (isAdminRole(user)) return;
        courseJpaRepository.findByLessonId(quiz.getLessonId()).ifPresentOrElse(
            course -> {
                if (course.getTeacherId() == null || !course.getTeacherId().equals(user.getId())) {
                    throw new org.springframework.security.access.AccessDeniedException("Bạn không sở hữu bài kiểm tra này");
                }
            },
            () -> { throw new com.example.lms.shared.exception.EntityNotFoundException("Course for quiz", quiz.getId()); }
        );
    }
}

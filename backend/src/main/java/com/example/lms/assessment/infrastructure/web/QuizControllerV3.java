package com.example.lms.assessment.infrastructure.web;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.example.lms.assessment.application.port.StudentAssessmentAccessPort;
import com.example.lms.assessment.application.usecase.CreateQuizUseCaseV3;
import com.example.lms.assessment.application.usecase.EvaluateSectionQuizUseCase;
import com.example.lms.assessment.application.usecase.GetQuizStatisticsUseCase;
import com.example.lms.assessment.application.dto.QuizAttemptResponse;
import com.example.lms.assessment.application.usecase.QuizAttemptUseCase;
import com.example.lms.assessment.application.usecase.QuizManagementUseCase;
import com.example.lms.assessment.domain.model.Quiz;
import com.example.lms.assessment.domain.model.QuizAttempt;
import com.example.lms.assessment.infrastructure.persistence.entity.QuestionJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.QuizAssignmentJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.QuizAttemptJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.QuizJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.QuestionJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizAssignmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizAttemptJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizJpaRepositoryV3;
import com.example.lms.course_authoring.application.usecase.CreateLessonUseCaseV3;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.entity.LessonJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.ChapterJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaLearningClassRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.EnrollmentJpaEntity;
import com.example.lms.shared.domain.model.ContentBlock;
import com.example.lms.shared.infrastructure.persistence.entity.PaymentTransactionJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.PaymentTransactionJpaRepository;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
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
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
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
    private final EvaluateSectionQuizUseCase evaluateSectionQuizUseCase;
    private final GetQuizStatisticsUseCase getQuizStatisticsUseCase;
    private final QuestionJpaRepository questionJpaRepository;
    private final QuizJpaRepositoryV3 quizJpaRepository;
    private final QuizAttemptJpaRepository attemptJpaRepository;
    private final JpaCourseRepository courseJpaRepository;
    private final CreateLessonUseCaseV3 createLessonUseCase;
    private final ChapterJpaRepository chapterJpaRepository;
    private final LessonJpaRepository lessonJpaRepository;
    private final QuizAssignmentJpaRepository quizAssignmentJpaRepository;
    private final JpaLearningClassRepository classJpaRepository;
    private final JpaEnrollmentRepository enrollmentJpaRepository;
    private final StudentAssessmentAccessPort studentAssessmentAccessPort;
    private final PaymentTransactionJpaRepository paymentTransactionJpaRepository;

    // ============ Teacher CRUD Operations ============

    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Create a new quiz")
    public ResponseEntity<ApiResponse<UUID>> createQuiz(
            @RequestBody @Valid CreateQuizUseCaseV3.CreateQuizCommand command,
            @AuthenticationPrincipal UserJpaEntity user) {
        verifyLessonOwnership(command.lessonId(), user);
        try {
            ensureLessonSupportsQuizCreation(command.lessonId());
            UUID quizId = createQuizUseCase.execute(command);
            return ResponseEntity.ok(ApiResponse.success(quizId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/lessons/{lessonId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Create a fully configured quiz for an existing lesson")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createLessonQuiz(
            @PathVariable UUID lessonId,
            @Valid @RequestBody StructuredQuizRequest request,
            @AuthenticationPrincipal UserJpaEntity user) {
        verifyLessonOwnership(lessonId, user);
        try {
            ensureLessonSupportsQuizCreation(lessonId);
            QuizSchedule schedule = parseQuizSchedule(request);
            UUID quizId = createStructuredQuiz(lessonId, request, schedule, user);
            return ResponseEntity.ok(ApiResponse.success(buildCreatedQuizResponse(quizId, lessonId, null, null)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/chapters/{chapterId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Create a quiz lesson and quiz inside a chapter")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createChapterQuiz(
            @PathVariable UUID chapterId,
            @Valid @RequestBody StructuredQuizRequest request,
            @AuthenticationPrincipal UserJpaEntity user) {
        verifyChapterOwnership(chapterId, user);
        try {
            QuizSchedule schedule = parseQuizSchedule(request);
            UUID lessonId = createQuizLesson(chapterId, request);
            UUID quizId = createStructuredQuiz(lessonId, request, schedule, user);
            return ResponseEntity.ok(ApiResponse.success(buildCreatedQuizResponse(quizId, lessonId, null, null)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/sections/{sectionId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Legacy alias for chapter-anchored quiz creation")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createSectionQuiz(
            @PathVariable UUID sectionId,
            @Valid @RequestBody StructuredQuizRequest request,
            @AuthenticationPrincipal UserJpaEntity user) {
        return createChapterQuiz(sectionId, request, user);
    }

    @PostMapping("/courses/{courseId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Create a course-scoped quiz with optional class distribution")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createCourseQuiz(
            @PathVariable UUID courseId,
            @Valid @RequestBody StructuredQuizRequest request,
            @AuthenticationPrincipal UserJpaEntity user) {
        verifyCourseOwnership(courseId, user);
        try {
            UUID chapterId = request.chapterId();
            if (chapterId == null) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Vui lòng chọn chương để neo quiz vào cấu trúc khóa học"));
            }

            CourseJpaEntity course = loadCourse(courseId);
            ensureChapterBelongsToCourse(chapterId, courseId);
            if (request.classId() != null) {
                if (course.getDeliveryMode() != CourseJpaEntity.DeliveryMode.INSTRUCTOR_LED) {
                    return ResponseEntity.badRequest()
                            .body(ApiResponse.error("Chỉ khóa học dạng lớp học mới hỗ trợ giao quiz theo lớp"));
                }
                ensureClassBelongsToCourse(request.classId(), courseId);
            }

            QuizSchedule schedule = parseQuizSchedule(request);
            UUID lessonId = createQuizLesson(chapterId, request);
            UUID quizId = createStructuredQuiz(lessonId, request, schedule, user);

            quizAssignmentJpaRepository.save(QuizAssignmentJpaEntity.builder()
                    .quizId(quizId)
                    .courseId(courseId)
                    .classId(request.classId())
                    .dueDate(schedule.dueAt())
                    .isActive(true)
                    .build());

            return ResponseEntity.ok(ApiResponse.success(
                    buildCreatedQuizResponse(quizId, lessonId, courseId, request.classId())));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/{quizId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN', 'STUDENT')")
    @Operation(summary = "Get quiz by ID")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getQuizById(
            @PathVariable UUID quizId,
            @AuthenticationPrincipal UserJpaEntity user) {
        Quiz quiz = quizManagementUseCase.getQuizById(quizId);
        if (user.getRole() == UserJpaEntity.UserRole.STUDENT) {
            if (!quiz.isPublished() || !studentAssessmentAccessPort.canAccessQuiz(quizId, user.getId())) {
                return ResponseEntity.status(403).body(ApiResponse.error("Ban khong co quyen truy cap bai kiem tra nay"));
            }
        } else {
            verifyLessonOwnership(quiz.getLessonId(), user);
        }
        return ResponseEntity.ok(ApiResponse.success(toQuizMap(quiz)));
    }

    @GetMapping("/lessons/{lessonId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN', 'STUDENT')")
    @Operation(summary = "Get quizzes for a lesson")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getQuizzesByLesson(
            @PathVariable UUID lessonId,
            @AuthenticationPrincipal UserJpaEntity user) {
        if (user.getRole() != UserJpaEntity.UserRole.STUDENT) {
            verifyLessonOwnership(lessonId, user);
        }
        List<Quiz> quizzes = quizManagementUseCase.getQuizzesByLesson(lessonId);
        if (user.getRole() == UserJpaEntity.UserRole.STUDENT) {
            UUID studentId = user.getId();
            quizzes = quizzes.stream()
                    .filter(Quiz::isPublished)
                    .filter(quiz -> studentAssessmentAccessPort.canAccessQuiz(quiz.getId().value(), studentId))
                    .toList();
        }
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
        if (user.getRole() == UserJpaEntity.UserRole.STUDENT) {
            if (!quiz.isPublished() || !studentAssessmentAccessPort.canAccessQuiz(quizId, user.getId())) {
                return ResponseEntity.status(403).body(ApiResponse.error("Ban khong co quyen truy cap bai kiem tra nay"));
            }
        } else {
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

    @GetMapping("/lessons/{lessonId}/questions")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN', 'STUDENT')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get quiz questions by lesson ID")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getQuizQuestionsByLesson(
            @PathVariable UUID lessonId,
            @AuthenticationPrincipal UserJpaEntity user) {
        QuizJpaEntity quizEntity = resolveQuizEntityByLessonId(lessonId);
        return getQuizQuestions(quizEntity.getId(), user);
    }

    @GetMapping("/lessons/{lessonId}/sections/{sectionId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN', 'STUDENT')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get embedded section quiz for learner flow")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSectionQuiz(
            @PathVariable UUID lessonId,
            @PathVariable UUID sectionId,
            @AuthenticationPrincipal UserJpaEntity user) {
        try {
            SectionQuizDefinition definition = loadSectionQuizDefinition(lessonId, sectionId, user);
            return ResponseEntity.ok(ApiResponse.success(toSectionQuizMap(definition)));
        } catch (org.springframework.security.access.AccessDeniedException ex) {
            return ResponseEntity.status(403).body(ApiResponse.error(ex.getMessage()));
        }
    }

    @PostMapping("/lessons/{lessonId}/sections/{sectionId}/submit")
    @PreAuthorize("hasRole('STUDENT')")
    @Transactional
    @Operation(summary = "Submit answers for an embedded section quiz")
    public ResponseEntity<ApiResponse<Map<String, Object>>> submitSectionQuiz(
            @PathVariable UUID lessonId,
            @PathVariable UUID sectionId,
            @Valid @RequestBody List<QuizAttempt.AttemptAnswer> answers,
            @AuthenticationPrincipal UserJpaEntity user) {
        try {
            SectionQuizDefinition definition = loadSectionQuizDefinition(lessonId, sectionId, user);
            EvaluateSectionQuizUseCase.Result result = evaluateSectionQuizUseCase.execute(
                    new EvaluateSectionQuizUseCase.Command(
                            definition.questionIds(),
                            definition.passingScore(),
                            definition.showResultsImmediately(),
                            definition.showCorrectAnswers(),
                            answers));

            if (result.isPassed()) {
                recordPassedSectionQuiz(user.getId(), courseIdForLesson(lessonId), lessonId, sectionId);
            }

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("id", definition.quizId());
            payload.put("quizId", definition.quizId());
            payload.put("lessonId", lessonId.toString());
            payload.put("sectionId", sectionId.toString());
            payload.put("quizType", definition.assessmentType().name());
            payload.put("countsTowardCertificate", definition.countsTowardCertificate());
            payload.put("status", "SUBMITTED");
            payload.put("score", result.score());
            payload.put("correctAnswers", result.correctAnswers());
            payload.put("totalQuestions", result.totalQuestions());
            payload.put("isPassed", result.isPassed());
            payload.put("items", result.items());
            payload.put("message", result.message());
            payload.put("submittedAt", Instant.now().toString());
            return ResponseEntity.ok(ApiResponse.success(payload));
        } catch (org.springframework.security.access.AccessDeniedException ex) {
            return ResponseEntity.status(403).body(ApiResponse.error(ex.getMessage()));
        }
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
        Quiz updated = quizManagementUseCase.updateQuizSettings(
                quizId,
                newSettings,
                request.title(),
                parseAssessmentType(request.quizType(), null),
                Boolean.TRUE.equals(request.countsTowardCertificate()),
                user.getId(),
                user.getRole().name());
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
    @Operation(summary = "Get teacher's quizzes with attempt statistics")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getTeacherQuizzes(
            @AuthenticationPrincipal UserJpaEntity user) {
        var quizEntities = quizJpaRepository.findAllByTeacherId(user.getId());

        // Batch-load stats to avoid N+1
        List<UUID> quizIds = quizEntities.stream()
                .map(QuizJpaEntity::getId)
                .collect(java.util.stream.Collectors.toList());

        // Attempt stats
        Map<UUID, Map<String, Object>> statsMap = new HashMap<>();
        if (!quizIds.isEmpty()) {
            List<Object[]> rawStats = attemptJpaRepository.batchQuizStats(quizIds);
            for (Object[] row : rawStats) {
                UUID quizId = (UUID) row[0];
                Map<String, Object> stats = new HashMap<>();
                stats.put("attemptStudentCount", ((Number) row[1]).intValue());
                stats.put("completedAttempts", ((Number) row[2]).intValue());
                stats.put("averageScore", row[3] != null ? Math.round(((Number) row[3]).doubleValue() * 10.0) / 10.0 : null);
                stats.put("passedCount", ((Number) row[4]).intValue());
                stats.put("totalAttempts", ((Number) row[5]).intValue());
                statsMap.put(quizId, stats);
            }
        }

        // Essay question counts
        Map<UUID, Integer> essayCountMap = new HashMap<>();
        if (!quizIds.isEmpty()) {
            List<Object[]> essayRows = questionJpaRepository.batchEssayQuestionCount(quizIds);
            for (Object[] row : essayRows) {
                UUID quizId = (UUID) row[0];
                essayCountMap.put(quizId, ((Number) row[1]).intValue());
            }
        }

        // Pending essay grading: count SUBMITTED (not yet GRADED) attempts for quizzes with essay questions
        Map<UUID, Integer> pendingEssayMap = new HashMap<>();
        if (!quizIds.isEmpty()) {
            List<UUID> essayQuizIds = essayCountMap.entrySet().stream()
                    .filter(e -> e.getValue() > 0)
                    .map(Map.Entry::getKey)
                    .collect(java.util.stream.Collectors.toList());
            for (UUID eqId : essayQuizIds) {
                long pendingCount = attemptJpaRepository.countSubmittedByQuizId(eqId);
                if (pendingCount > 0) {
                    pendingEssayMap.put(eqId, (int) pendingCount);
                }
            }
        }

        List<Map<String, Object>> result = quizEntities.stream()
                .map(entity -> {
                    Map<String, Object> map = toQuizEntityMap(entity);
                    UUID quizId = entity.getId();

                    // Add stats
                    Map<String, Object> stats = statsMap.getOrDefault(quizId, Map.of());
                    map.put("attemptStudentCount", stats.getOrDefault("attemptStudentCount", 0));
                    map.put("completedAttempts", stats.getOrDefault("completedAttempts", 0));
                    map.put("averageScore", stats.getOrDefault("averageScore", null));
                    map.put("passedCount", stats.getOrDefault("passedCount", 0));
                    map.put("totalAttempts", stats.getOrDefault("totalAttempts", 0));

                    // Calculate pass rate
                    int totalAttempts = ((Number) map.get("totalAttempts")).intValue();
                    int passedCount = ((Number) map.get("passedCount")).intValue();
                    map.put("passRate", totalAttempts > 0
                            ? Math.round((double) passedCount / totalAttempts * 1000.0) / 10.0
                            : null);

                    // Essay info
                    map.put("essayQuestionCount", essayCountMap.getOrDefault(quizId, 0));
                    map.put("pendingEssayCount", pendingEssayMap.getOrDefault(quizId, 0));

                    return map;
                })
                .collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    // ============ Student Operations ============

    @PostMapping("/{quizId}/attempts/start")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Start a quiz attempt")
    public ResponseEntity<ApiResponse<QuizAttemptResponse>> startAttempt(
            @PathVariable UUID quizId,
            @AuthenticationPrincipal UserJpaEntity user) {
        UUID studentId = user.getId();
        QuizAttempt attempt = quizAttemptUseCase.startAttempt(quizId, studentId);
        return ResponseEntity.ok(ApiResponse.success(
                QuizAttemptResponse.from(attempt)));
    }

    @PostMapping("/attempts/{attemptId}/submit")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Submit a quiz attempt")
    public ResponseEntity<ApiResponse<QuizAttemptResponse>> submitAttempt(
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
            return ResponseEntity.ok(ApiResponse.success(
                    QuizAttemptResponse.from(result)));
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

    private record SectionQuizDefinition(
            String quizId,
            UUID lessonId,
            UUID sectionId,
            String title,
            Quiz.AssessmentType assessmentType,
            boolean countsTowardCertificate,
            Integer timeLimitMinutes,
            Integer maxAttempts,
            Integer passingScore,
            boolean shuffleQuestions,
            boolean shuffleOptions,
            boolean showResultsImmediately,
            boolean showCorrectAnswers,
            List<UUID> questionIds,
            List<QuestionJpaEntity> questions
    ) {}

    private SectionQuizDefinition loadSectionQuizDefinition(UUID lessonId, UUID sectionId, UserJpaEntity user) {
        LessonJpaEntity lesson = lessonJpaRepository.findById(lessonId)
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Lesson", lessonId));

        CourseJpaEntity course = courseJpaRepository.findByLessonId(lessonId)
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Khóa học", lessonId));

        verifySectionQuizAccess(course, lesson, user);

        ContentBlock quizSection = findSectionQuizBlock(lesson, sectionId);
        Map<String, Object> blockData = quizSection.getData() != null ? quizSection.getData() : Map.of();
        Map<String, Object> quizData = asMap(blockData.get("quizData"));
        if (quizData == null) {
            throw new com.example.lms.shared.exception.EntityNotFoundException("Section quiz", sectionId);
        }

        List<UUID> questionIds = extractSectionQuizQuestionIds(blockData);
        Map<UUID, QuestionJpaEntity> questionMap = new LinkedHashMap<>();
        if (!questionIds.isEmpty()) {
            for (QuestionJpaEntity question : questionJpaRepository.findAllById(questionIds)) {
                questionMap.put(question.getId(), question);
            }
        }

        List<QuestionJpaEntity> orderedQuestions = questionIds.stream()
                .map(questionMap::get)
                .filter(Objects::nonNull)
                .toList();

        return new SectionQuizDefinition(
                "section:" + sectionId,
                lessonId,
                sectionId,
                asString(firstNonNull(quizData.get("title"), blockData.get("title"), lesson.getTitle()), lesson.getTitle()),
                parseAssessmentType(quizData.get("quizType"), Quiz.AssessmentType.ASSESSMENT),
                asBoolean(quizData.get("countsTowardCertificate"), false)
                        && parseAssessmentType(quizData.get("quizType"), Quiz.AssessmentType.ASSESSMENT) == Quiz.AssessmentType.EXAM,
                asInteger(quizData.get("timeLimitMinutes"), 30),
                asInteger(quizData.get("maxAttempts"), 1),
                asInteger(quizData.get("passingScore"), 60),
                asBoolean(quizData.get("shuffleQuestions"), true),
                asBoolean(quizData.get("shuffleOptions"), true),
                asBoolean(quizData.get("showResultsImmediately"), true),
                asBoolean(quizData.get("showCorrectAnswers"), true),
                questionIds,
                orderedQuestions
        );
    }

    private void verifySectionQuizAccess(CourseJpaEntity course, LessonJpaEntity lesson, UserJpaEntity user) {
        if (user.getRole() == UserJpaEntity.UserRole.STUDENT) {
            if (course.getPriceType() == CourseJpaEntity.PriceType.FREE) {
                return;
            }
            boolean lessonFree = Boolean.TRUE.equals(lesson.getIsFree());
            boolean enrolled = enrollmentJpaRepository.findByStudentIdAndCourseId(user.getId(), course.getId())
                    .map(EnrollmentJpaEntity::getStatus)
                    .map(status -> status == EnrollmentJpaEntity.EnrollmentStatus.ACTIVE
                            || status == EnrollmentJpaEntity.EnrollmentStatus.COMPLETED)
                    .orElse(false);
            boolean paid = paymentTransactionJpaRepository.existsByStudentIdAndCourseIdAndStatus(
                    user.getId(),
                    course.getId(),
                    PaymentTransactionJpaEntity.PaymentStatus.COMPLETED
            );
            if (!lessonFree && !enrolled && !paid) {
                throw new org.springframework.security.access.AccessDeniedException("Bạn cần đăng ký hoặc thanh toán để mở bài kiểm tra này");
            }
            return;
        }

        verifyLessonOwnership(lesson.getId(), user);
    }

    private ContentBlock findSectionQuizBlock(LessonJpaEntity lesson, UUID sectionId) {
        return lesson.getContentBlocks().stream()
                .filter(block -> block.getId() != null && sectionId.toString().equals(block.getId()))
                .filter(block -> "QUIZ".equalsIgnoreCase(block.getType()))
                .findFirst()
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Section quiz", sectionId));
    }

    private Map<String, Object> toSectionQuizMap(SectionQuizDefinition definition) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", definition.quizId());
        map.put("quizId", definition.quizId());
        map.put("lessonId", definition.lessonId().toString());
        map.put("sectionId", definition.sectionId().toString());
        map.put("title", definition.title());
        map.put("quizType", definition.assessmentType().name());
        map.put("countsTowardCertificate", definition.countsTowardCertificate());
        map.put("allowOffline", definition.assessmentType() == Quiz.AssessmentType.PRACTICE);
        map.put("timeLimitMinutes", definition.timeLimitMinutes());
        map.put("maxAttempts", definition.maxAttempts());
        map.put("passingScore", definition.passingScore());
        map.put("shuffleQuestions", definition.shuffleQuestions());
        map.put("shuffleOptions", definition.shuffleOptions());
        map.put("showResultsImmediately", definition.showResultsImmediately());
        map.put("showCorrectAnswers", definition.showCorrectAnswers());
        map.put("questionCount", definition.questions().size());
        map.put("questions", definition.questions().stream().map(this::toStudentQuestionMap).toList());
        return map;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> asMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return null;
    }

    private List<UUID> extractSectionQuizQuestionIds(Map<String, Object> blockData) {
        Map<String, Object> quizData = asMap(blockData.get("quizData"));
        if (quizData == null) {
            return List.of();
        }

        Object rawQuestionIds = firstNonNull(quizData.get("questionIds"), quizData.get("questions"));
        if (!(rawQuestionIds instanceof List<?> questionList)) {
            return List.of();
        }

        List<UUID> questionIds = new ArrayList<>();
        for (Object rawItem : questionList) {
            if (rawItem == null) {
                continue;
            }

            String rawId = null;
            if (rawItem instanceof Map<?, ?> question) {
                Object questionId = question.get("id");
                rawId = questionId != null ? questionId.toString() : null;
            } else {
                rawId = rawItem.toString();
            }

            if (rawId == null || rawId.isBlank()) {
                continue;
            }

            try {
                questionIds.add(UUID.fromString(rawId));
            } catch (IllegalArgumentException ignored) {
                // Ignore malformed legacy values instead of failing the entire quiz.
            }
        }
        return questionIds;
    }

    private String asString(Object value, String fallback) {
        if (value == null) {
            return fallback;
        }
        String text = value.toString();
        return text.isBlank() ? fallback : text;
    }

    private Integer asInteger(Object value, Integer fallback) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value != null) {
            try {
                return Integer.parseInt(value.toString());
            } catch (NumberFormatException ignored) {
                // Fallback below.
            }
        }
        return fallback;
    }

    private boolean asBoolean(Object value, boolean fallback) {
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value != null) {
            return Boolean.parseBoolean(value.toString());
        }
        return fallback;
    }

    private Quiz.AssessmentType parseAssessmentType(Object value, Quiz.AssessmentType fallback) {
        if (value == null) {
            return fallback;
        }

        try {
            return Quiz.AssessmentType.valueOf(value.toString().trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return fallback;
        }
    }

    private UUID courseIdForLesson(UUID lessonId) {
        return courseJpaRepository.findByLessonId(lessonId)
                .map(CourseJpaEntity::getId)
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Course for lesson", lessonId));
    }

    private void recordPassedSectionQuiz(UUID studentId, UUID courseId, UUID lessonId, UUID sectionId) {
        enrollmentJpaRepository.findByStudentIdAndCourseId(studentId, courseId).ifPresent(enrollment -> {
            Map<String, EnrollmentJpaEntity.LessonProgressData> progress = enrollment.getProgress();
            if (progress == null) {
                progress = new HashMap<>();
                enrollment.setProgress(progress);
            }

            String lessonKey = lessonId.toString();
            EnrollmentJpaEntity.LessonProgressData lessonProgress = progress.getOrDefault(
                    lessonKey,
                    EnrollmentJpaEntity.LessonProgressData.builder()
                            .status("UNLOCKED")
                            .completedSections(new ArrayList<>())
                            .build());

            List<String> completedSections = lessonProgress.getCompletedSections();
            if (completedSections == null) {
                completedSections = new ArrayList<>();
                lessonProgress.setCompletedSections(completedSections);
            }

            String marker = "quiz:" + sectionId;
            if (!completedSections.contains(marker)) {
                completedSections.add(marker);
            }

            lessonProgress.setLastActivity(Instant.now().toString());
            progress.put(lessonKey, lessonProgress);
            enrollmentJpaRepository.save(enrollment);
        });
    }

    private Object firstNonNull(Object... values) {
        for (Object value : values) {
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private Map<String, Object> toQuizMap(Quiz quiz) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", quiz.getId().value().toString());
        map.put("lessonId", quiz.getLessonId().toString());
        map.put("title", quiz.getTitle());
        map.put("description", quiz.getDescription());
        map.put("quizType", quiz.getAssessmentType().name());
        map.put("countsTowardCertificate", quiz.isCountsTowardCertificate());
        map.put("allowOffline", quiz.getAssessmentType() == Quiz.AssessmentType.PRACTICE);
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
        appendAssignmentContext(map, quiz.getId().value(), quiz.getLessonId());
        return map;
    }

    private Map<String, Object> toQuizEntityMap(QuizJpaEntity entity) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", entity.getId().toString());
        map.put("lessonId", entity.getLessonId().toString());
        map.put("title", entity.getTitle());
        map.put("description", entity.getDescription());
        map.put("quizType", entity.getAssessmentType().name());
        map.put("countsTowardCertificate", Boolean.TRUE.equals(entity.getCountsTowardCertificate()));
        map.put("allowOffline", entity.getAssessmentType() == QuizJpaEntity.AssessmentType.PRACTICE);
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
        appendAssignmentContext(map, entity.getId(), entity.getLessonId());
        return map;
    }

    private void appendAssignmentContext(Map<String, Object> map, UUID quizId, UUID lessonId) {
        var assignment = quizAssignmentJpaRepository.findFirstByQuizIdOrderByAssignedAtDesc(quizId).orElse(null);
        if (assignment == null) {
            map.put("assignmentScope", "LESSON");
            courseJpaRepository.findByLessonId(lessonId).ifPresent(course -> {
                map.put("courseId", course.getId().toString());
                map.put("courseTitle", course.getTitle());
                map.put("deliveryMode", course.getDeliveryMode() != null ? course.getDeliveryMode().name() : null);
            });
            return;
        }

        map.put("assignmentScope", assignment.getClassId() != null ? "CLASS" : "COURSE");
        map.put("assignedAt", assignment.getAssignedAt() != null ? assignment.getAssignedAt().toString() : null);

        if (assignment.getCourseId() != null) {
            map.put("courseId", assignment.getCourseId().toString());
            courseJpaRepository.findById(assignment.getCourseId()).ifPresent(course -> {
                map.put("courseTitle", course.getTitle());
                map.put("deliveryMode", course.getDeliveryMode() != null ? course.getDeliveryMode().name() : null);
            });
        }

        if (assignment.getClassId() != null) {
            map.put("classId", assignment.getClassId().toString());
            classJpaRepository.findById(assignment.getClassId()).ifPresent(learningClass ->
                map.put("className", learningClass.getName())
            );
        }
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
            String quizType,
            Boolean countsTowardCertificate,
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

    public record StructuredQuizRequest(
            @NotBlank(message = "Quiz title is required")
            String title,
            String description,
            String quizType,
            Boolean countsTowardCertificate,
            @Min(value = 1, message = "Time limit must be greater than 0")
            Integer timeLimitMinutes,
            @Min(value = 1, message = "Max attempts must be greater than 0")
            Integer maxAttempts,
            @Min(value = 0, message = "Passing score cannot be negative")
            @Max(value = 100, message = "Passing score cannot exceed 100")
            Integer passingScore,
            Boolean shuffleQuestions,
            Boolean shuffleOptions,
            Boolean showResultsImmediately,
            Boolean showCorrectAnswers,
            String startDate,
            String endDate,
            @JsonProperty("chapterId")
            @JsonAlias("sectionId")
            UUID chapterId,
            UUID classId,
            @NotNull(message = "Question list is required")
            List<UUID> questionIds,
            Boolean publishImmediately
    ) {}

    public record ManualGradeRequest(
            @NotNull(message = "Mã câu hỏi không được để trống")
            UUID questionId,
            @NotNull(message = "Điểm không được để trống")
            @PositiveOrZero(message = "Điểm không được âm")
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

    private void verifyCourseOwnership(UUID courseId, UserJpaEntity user) {
        if (isAdminRole(user)) return;
        CourseJpaEntity course = loadCourse(courseId);
        if (course.getTeacherId() == null || !course.getTeacherId().equals(user.getId())) {
            throw new org.springframework.security.access.AccessDeniedException("Bạn không sở hữu khóa học này");
        }
    }

    private void verifyChapterOwnership(UUID chapterId, UserJpaEntity user) {
        if (isAdminRole(user)) return;
        courseJpaRepository.findByChapterId(chapterId).ifPresentOrElse(
            course -> {
                if (course.getTeacherId() == null || !course.getTeacherId().equals(user.getId())) {
                    throw new org.springframework.security.access.AccessDeniedException("Bạn không sở hữu tài nguyên này");
                }
            },
            () -> { throw new com.example.lms.shared.exception.EntityNotFoundException("Course for chapter", chapterId); }
        );
    }

    private CourseJpaEntity loadCourse(UUID courseId) {
        return courseJpaRepository.findById(courseId)
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Course", courseId));
    }

    private void ensureLessonSupportsQuizCreation(UUID lessonId) {
        LessonJpaEntity lesson = lessonJpaRepository.findById(lessonId)
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Lesson", lessonId));
        if (lesson.getType() != LessonJpaEntity.LessonType.QUIZ) {
            throw new IllegalArgumentException("Chi co the khoi tao quiz cho lesson loai QUIZ");
        }
    }

    private void ensureChapterBelongsToCourse(UUID chapterId, UUID courseId) {
        UUID actualCourseId = chapterJpaRepository.findById(chapterId)
                .map(chapter -> chapter.getCourseId())
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Chapter", chapterId));
        if (!actualCourseId.equals(courseId)) {
            throw new IllegalArgumentException("Chương không thuộc khóa học đã chọn");
        }
    }

    private void ensureClassBelongsToCourse(UUID classId, UUID courseId) {
        var learningClass = classJpaRepository.findById(classId)
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Class", classId));
        if (!courseId.equals(learningClass.getCourseId())) {
            throw new IllegalArgumentException("Lớp học không thuộc khóa học đã chọn");
        }
    }

    private QuizJpaEntity resolveQuizEntityByLessonId(UUID lessonId) {
        List<QuizJpaEntity> quizzes = quizJpaRepository.findByLessonId(lessonId);
        if (quizzes.isEmpty()) {
            throw new com.example.lms.shared.exception.EntityNotFoundException("Quiz for lesson", lessonId);
        }
        if (quizzes.size() > 1) {
            log.warn("Multiple quizzes found for lesson {}. Falling back to the most recently created quiz.", lessonId);
        }
        return quizzes.stream()
                .max(Comparator.comparing(QuizJpaEntity::getCreatedAt,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .orElse(quizzes.get(0));
    }

    private UUID createQuizLesson(UUID chapterId, StructuredQuizRequest request) {
        return createLessonUseCase.execute(new CreateLessonUseCaseV3.CreateLessonCommand(
                chapterId,
                request.title(),
                request.description(),
                "QUIZ",
                null,
                0,
                null,
                Boolean.FALSE
        ));
    }

    private UUID createStructuredQuiz(
            UUID lessonId,
            StructuredQuizRequest request,
            QuizSchedule schedule,
            UserJpaEntity user) {
        List<UUID> questionIds = request.questionIds() != null ? request.questionIds() : List.of();
        if (questionIds.isEmpty() && Boolean.TRUE.equals(request.publishImmediately())) {
            throw new IllegalArgumentException("Vui lòng chọn ít nhất một câu hỏi");
        }

        UUID quizId = createQuizUseCase.execute(new CreateQuizUseCaseV3.CreateQuizCommand(
                lessonId,
                request.title(),
                request.description(),
                request.timeLimitMinutes(),
                request.passingScore(),
                request.shuffleQuestions(),
                request.showResultsImmediately(),
                parseAssessmentType(request.quizType(), Quiz.AssessmentType.PRACTICE),
                Boolean.TRUE.equals(request.countsTowardCertificate())
        ));

        for (int i = 0; i < questionIds.size(); i++) {
            quizManagementUseCase.addQuestionToQuiz(
                    quizId,
                    questionIds.get(i),
                    i,
                    user.getId(),
                    user.getRole().name()
            );
        }

        Quiz.QuizSettings newSettings = Quiz.QuizSettings.builder()
                .timeLimitMinutes(request.timeLimitMinutes())
                .maxAttempts(request.maxAttempts())
                .passingScore(request.passingScore())
                .shuffleQuestions(request.shuffleQuestions())
                .shuffleOptions(request.shuffleOptions())
                .showResultsImmediately(request.showResultsImmediately())
                .showCorrectAnswers(request.showCorrectAnswers())
                .availableFrom(schedule.availableFrom())
                .dueAt(schedule.dueAt())
                .lockAt(schedule.dueAt())
                .build();

        quizManagementUseCase.updateQuizSettings(
                quizId,
                newSettings,
                request.title(),
                parseAssessmentType(request.quizType(), Quiz.AssessmentType.PRACTICE),
                Boolean.TRUE.equals(request.countsTowardCertificate()),
                user.getId(),
                user.getRole().name());

        if (Boolean.TRUE.equals(request.publishImmediately())) {
            quizManagementUseCase.publishQuiz(quizId, user.getId(), user.getRole().name());
        }

        return quizId;
    }

    private QuizSchedule parseQuizSchedule(StructuredQuizRequest request) {
        try {
            Instant availableFrom = request.startDate() != null && !request.startDate().isBlank()
                    ? Instant.parse(request.startDate())
                    : null;
            Instant dueAt = request.endDate() != null && !request.endDate().isBlank()
                    ? Instant.parse(request.endDate())
                    : null;
            return new QuizSchedule(availableFrom, dueAt);
        } catch (java.time.format.DateTimeParseException e) {
            throw new IllegalArgumentException("Định dạng thời gian không hợp lệ", e);
        }
    }

    private Map<String, Object> buildCreatedQuizResponse(
            UUID quizId,
            UUID lessonId,
            UUID courseId,
            UUID classId) {
        Map<String, Object> response = new HashMap<>(toQuizMap(quizManagementUseCase.getQuizById(quizId)));
        response.put("lessonId", lessonId.toString());
        if (courseId != null) {
            response.put("courseId", courseId.toString());
        }
        if (classId != null) {
            response.put("classId", classId.toString());
        }
        return response;
    }

    private record QuizSchedule(Instant availableFrom, Instant dueAt) {}
}

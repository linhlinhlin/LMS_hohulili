package com.example.lms.assessment.infrastructure.web;

import com.example.lms.assessment.application.usecase.CreateQuizUseCaseV3;
import com.example.lms.assessment.application.usecase.QuizAttemptUseCase;
import com.example.lms.assessment.application.usecase.QuizManagementUseCase;
import com.example.lms.assessment.domain.model.QuizAttempt;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v3/quizzes")
@RequiredArgsConstructor
@Tag(name = "Quiz V3", description = "Quiz Management and Attempts (V3)")
public class QuizControllerV3 {

    private final CreateQuizUseCaseV3 createQuizUseCase;
    private final QuizManagementUseCase quizManagementUseCase;
    private final QuizAttemptUseCase quizAttemptUseCase;

    // ============ Teacher Operations ============

    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR')")
    @Operation(summary = "Create a new quiz")
    public ResponseEntity<ApiResponse<UUID>> createQuiz(@RequestBody @Valid CreateQuizUseCaseV3.CreateQuizCommand command) {
        UUID quizId = createQuizUseCase.execute(command);
        return ResponseEntity.ok(ApiResponse.success(quizId));
    }

    @PostMapping("/{quizId}/questions")
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR')")
    @Operation(summary = "Add a question to a quiz")
    public ResponseEntity<ApiResponse<Void>> addQuestion(
            @PathVariable UUID quizId,
            @RequestBody AddQuestionRequest request) {
        quizManagementUseCase.addQuestionToQuiz(quizId, request.questionId(), request.displayOrder());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @DeleteMapping("/{quizId}/questions/{questionId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR')")
    @Operation(summary = "Remove a question from a quiz")
    public ResponseEntity<ApiResponse<Void>> removeQuestion(
            @PathVariable UUID quizId,
            @PathVariable UUID questionId) {
        quizManagementUseCase.removeQuestionFromQuiz(quizId, questionId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
    
    @PostMapping("/{quizId}/publish")
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR')")
    @Operation(summary = "Publish a quiz")
    public ResponseEntity<ApiResponse<Void>> publishQuiz(@PathVariable UUID quizId) {
        quizManagementUseCase.publishQuiz(quizId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // ============ Student Operations ============

    @PostMapping("/{quizId}/attempts/start")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Start a quiz attempt")
    public ResponseEntity<ApiResponse<QuizAttempt>> startAttempt(
            @PathVariable UUID quizId,
            @RequestParam UUID studentId) { // Should check currentUser matches studentId
        QuizAttempt attempt = quizAttemptUseCase.startAttempt(quizId, studentId);
        return ResponseEntity.ok(ApiResponse.success(attempt));
    }

    @PostMapping("/attempts/{attemptId}/submit")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Submit a quiz attempt")
    public ResponseEntity<ApiResponse<QuizAttempt>> submitAttempt(
            @PathVariable UUID attemptId,
            @RequestBody List<QuizAttempt.AttemptAnswer> answers) {
        QuizAttempt result = quizAttemptUseCase.submitAttempt(attemptId, answers);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
    
    @GetMapping("/attempts/{attemptId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER')")
    @Operation(summary = "Get attempt result")
    public ResponseEntity<ApiResponse<QuizAttempt>> getAttempt(@PathVariable UUID attemptId) {
        QuizAttempt result = quizAttemptUseCase.getAttemptResult(attemptId);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    // DTOs
    public record AddQuestionRequest(UUID questionId, Integer displayOrder) {}
}

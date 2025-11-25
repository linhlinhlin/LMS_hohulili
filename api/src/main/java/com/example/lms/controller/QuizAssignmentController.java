package com.example.lms.controller;

import com.example.lms.dto.request.AssignQuizRequest;
import com.example.lms.dto.response.QuizAssignmentResponse;
import com.example.lms.usecase.AssignQuizToStudentsUseCase;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST Controller for Quiz Assignment operations
 */
@RestController
@RequestMapping("/api/v1/quizzes")
@RequiredArgsConstructor
@Slf4j
public class QuizAssignmentController {

    private final AssignQuizToStudentsUseCase assignQuizToStudentsUseCase;

    /**
     * Assign a quiz to students
     * POST /api/v1/quizzes/{quizId}/assignments
     */
    @PostMapping("/{quizId}/assignments")
    public ResponseEntity<ApiResponse<List<QuizAssignmentResponse>>> assignQuiz(
            @PathVariable UUID quizId,
            @Valid @RequestBody AssignQuizRequest request,
            Authentication authentication) {

        log.info("Assigning quiz {} to {} students", quizId, request.getStudentIds().size());

        UUID teacherId = getUserIdFromAuth(authentication);
        List<QuizAssignmentResponse> assignments = assignQuizToStudentsUseCase.execute(
            quizId,
            request,
            teacherId
        );

        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(ApiResponse.success(assignments, "Quiz assigned successfully"));
    }

    private UUID getUserIdFromAuth(Authentication authentication) {
        // Extract user ID from authentication
        // Implementation depends on your security setup
        return UUID.fromString(authentication.getName());
    }

    /**
     * API Response wrapper
     */
    public record ApiResponse<T>(
        boolean success,
        T data,
        String message,
        Object error
    ) {
        public static <T> ApiResponse<T> success(T data, String message) {
            return new ApiResponse<>(true, data, message, null);
        }

        public static <T> ApiResponse<T> error(String message, Object error) {
            return new ApiResponse<>(false, null, message, error);
        }
    }
}

package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.dto.request.CreateAssignmentQuizRequest;
import com.example.lms.dto.request.CreateLessonQuizRequest;
import com.example.lms.dto.response.QuizResponse;
import com.example.lms.entity.User;
import com.example.lms.usecase.CreateAssignmentQuizUseCase;
import com.example.lms.usecase.CreateLessonQuizUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * NEW REST Controller for Quiz Creation (DDD Approach)
 * Separate from legacy QuizController to maintain backward compatibility
 */
@RestController
@RequestMapping("/api/v2/quizzes")
@Tag(name = "Quiz Creation (DDD)", description = "New DDD-based quiz creation APIs")
@SecurityRequirement(name = "Bearer Authentication")
public class QuizCreationController {

    private static final Logger log = LoggerFactory.getLogger(QuizCreationController.class);

    private final CreateLessonQuizUseCase createLessonQuizUseCase;
    private final CreateAssignmentQuizUseCase createAssignmentQuizUseCase;

    public QuizCreationController(CreateLessonQuizUseCase createLessonQuizUseCase, CreateAssignmentQuizUseCase createAssignmentQuizUseCase) {
        this.createLessonQuizUseCase = createLessonQuizUseCase;
        this.createAssignmentQuizUseCase = createAssignmentQuizUseCase;
    }

    /**
     * Create lesson-bound quiz (DDD approach)
     * POST /api/v2/quizzes/lessons/{lessonId}
     */
    @PostMapping("/lessons/{lessonId}")
    @Operation(
        summary = "Tạo quiz cho lesson (DDD)",
        description = "Tạo quiz gắn với lesson - sử dụng DDD approach với domain validation"
    )
    public ResponseEntity<ApiResponse<QuizResponse>> createLessonQuiz(
            @PathVariable UUID lessonId,
            @Valid @RequestBody CreateLessonQuizRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            log.info("Creating lesson quiz for lesson: {}, teacher: {}", lessonId, currentUser.getId());
            
            QuizResponse quiz = createLessonQuizUseCase.execute(
                lessonId,
                request,
                currentUser.getId()
            );
            
            return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(quiz, "Quiz created successfully"));
                
        } catch (SecurityException e) {
            log.error("Security error creating lesson quiz: {}", e.getMessage());
            return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(e.getMessage()));
                
        } catch (IllegalArgumentException e) {
            log.error("Validation error creating lesson quiz: {}", e.getMessage());
            return ResponseEntity
                .badRequest()
                .body(ApiResponse.error(e.getMessage()));
                
        } catch (Exception e) {
            log.error("Unexpected error creating lesson quiz", e);
            return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("Internal server error: " + e.getMessage()));
        }
    }

    /**
     * Create assignment quiz (DDD approach)
     * POST /api/v2/quizzes/courses/{courseId}
     */
    @PostMapping("/courses/{courseId}")
    @Operation(
        summary = "Tạo quiz assignment (DDD)",
        description = "Tạo quiz độc lập cho course - sử dụng DDD approach"
    )
    public ResponseEntity<ApiResponse<QuizResponse>> createAssignmentQuiz(
            @PathVariable UUID courseId,
            @Valid @RequestBody CreateAssignmentQuizRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            log.info("Creating assignment quiz for course: {}, teacher: {}", courseId, currentUser.getId());
            
            // Set courseId from path variable
            request.setCourseId(courseId);
            
            QuizResponse quiz = createAssignmentQuizUseCase.execute(
                request,
                currentUser.getId()
            );
            
            return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(quiz, "Assignment quiz created successfully"));
                
        } catch (SecurityException e) {
            log.error("Security error creating assignment quiz: {}", e.getMessage());
            return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(e.getMessage()));
                
        } catch (IllegalArgumentException e) {
            log.error("Validation error creating assignment quiz: {}", e.getMessage());
            return ResponseEntity
                .badRequest()
                .body(ApiResponse.error(e.getMessage()));
                
        } catch (Exception e) {
            log.error("Unexpected error creating assignment quiz", e);
            return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("Internal server error: " + e.getMessage()));
        }
    }
}

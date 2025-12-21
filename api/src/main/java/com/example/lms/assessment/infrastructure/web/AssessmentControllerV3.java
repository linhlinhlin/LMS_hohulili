package com.example.lms.assessment.infrastructure.web;

import com.example.lms.assessment.application.usecase.CreateQuizUseCaseV3;
import com.example.lms.assessment.application.usecase.CreateAssignmentUseCaseV3;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.UUID;

/**
 * V3 Controller for Assessment.
 * Uses pure DDD patterns.
 */
@Tag(name = "Assessment V3", description = "DDD-based assessment endpoints")
@RestController
@RequestMapping("/api/v3/assessments")
@RequiredArgsConstructor
public class AssessmentControllerV3 {

    private final CreateQuizUseCaseV3 createQuizUseCase;
    private final CreateAssignmentUseCaseV3 createAssignmentUseCase;

    @Operation(summary = "Create a new quiz")
    @PostMapping("/quizzes")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<UUID> createQuiz(@RequestBody CreateQuizRequest request) {
        var command = new CreateQuizUseCaseV3.CreateQuizCommand(
            request.lessonId(),
            request.title(),
            request.description(),
            request.timeLimitMinutes(),
            request.passingScore(),
            request.shuffleQuestions(),
            request.showResultsImmediately()
        );
        UUID quizId = createQuizUseCase.execute(command);
        return ResponseEntity.ok(quizId);
    }

    @Operation(summary = "Create a new assignment")
    @PostMapping("/assignments")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<UUID> createAssignment(@RequestBody CreateAssignmentRequest request) {
        var command = new CreateAssignmentUseCaseV3.CreateAssignmentCommand(
            request.lessonId(),
            request.courseId(),
            request.title(),
            request.description(),
            request.instructions(),
            request.type(),
            request.maxScore(),
            request.dueDate(),
            request.allowLateSubmission()
        );
        UUID assignmentId = createAssignmentUseCase.execute(command);
        return ResponseEntity.ok(assignmentId);
    }

    // Request DTOs
    public record CreateQuizRequest(
        UUID lessonId,
        String title,
        String description,
        Integer timeLimitMinutes,
        Integer passingScore,
        Boolean shuffleQuestions,
        Boolean showResultsImmediately
    ) {}

    public record CreateAssignmentRequest(
        UUID lessonId,
        UUID courseId,
        String title,
        String description,
        String instructions,
        String type,
        Integer maxScore,
        Instant dueDate,
        Boolean allowLateSubmission
    ) {}
}

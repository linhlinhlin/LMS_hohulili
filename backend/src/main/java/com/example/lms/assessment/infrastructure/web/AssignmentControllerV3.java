package com.example.lms.assessment.infrastructure.web;

import com.example.lms.assessment.application.usecase.AssignmentUseCase;
import com.example.lms.assessment.application.usecase.CreateAssignmentCommand;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v3/teacher/assignments")
@RequiredArgsConstructor
@Tag(name = "Teacher - Assignments", description = "Endpoints for teachers to manage assignments")
public class AssignmentControllerV3 {

    private final AssignmentUseCase assignmentUseCase;

    private final com.example.lms.assessment.infrastructure.persistence.repository.AssignmentJpaRepository assignmentRepository;
    private final com.example.lms.assessment.application.usecase.CreateAssignmentUseCaseV3 createAssignmentUseCaseV3;
    private final com.example.lms.assessment.application.usecase.DeleteAssignmentUseCaseV3 deleteAssignmentUseCaseV3;

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR', 'ADMIN')")
    @Operation(summary = "Get summary of all assignments for the current teacher")
    public ResponseEntity<ApiResponse<Object>> getTeacherAssignmentsSummary(
            @AuthenticationPrincipal UserJpaEntity user) {
        
        var summary = assignmentUseCase.getTeacherAssignmentsSummary(user.getId());
        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @GetMapping("/courses/{courseId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR', 'ADMIN')")
    @Operation(summary = "Get assignments for a specific course")
    public ResponseEntity<ApiResponse<Object>> getAssignmentsByCourse(@PathVariable java.util.UUID courseId) {
        var result = assignmentUseCase.getAssignmentsByCourse(courseId);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    // === CRUD Operations for V3 ===

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR', 'ADMIN')")
    @Operation(summary = "Get assignment detail by ID")
    public ResponseEntity<ApiResponse<com.example.lms.assessment.application.dto.AssignmentDTOs.AssignmentDetail>> getAssignmentById(
            @PathVariable java.util.UUID id
    ) {
        return assignmentRepository.findById(id)
                .map(a -> {
                    // Map entity to DTO
                    var dto = com.example.lms.assessment.application.dto.AssignmentDTOs.AssignmentDetail.builder()
                        .id(a.getId().toString())
                        .title(a.getTitle())
                        .description(a.getDescription())
                        .instructions(a.getInstructions())
                        .maxScore(a.getMaxScore() != null ? a.getMaxScore().doubleValue() : 100.0)
                        .dueDate(a.getDueDate() != null ? a.getDueDate().toString() : null)
                        .status(a.getStatus().name())
                        .createdAt(a.getCreatedAt().toString())
                        .updatedAt(a.getUpdatedAt().toString())
                        .courseId(a.getCourseId().toString())
                        .build();
                    return ResponseEntity.ok(ApiResponse.success(dto, "Assignment loaded"));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @org.springframework.web.bind.annotation.PostMapping("/courses/{courseId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR', 'ADMIN')")
    @Operation(summary = "Create new assignment")
    public ResponseEntity<ApiResponse<java.util.UUID>> createAssignment(
            @PathVariable java.util.UUID courseId,
            @org.springframework.web.bind.annotation.RequestBody CreateAssignmentRequest request
    ) {
        var command = new CreateAssignmentCommand(
            null, // lessonId is optional now
            courseId,
            request.title(),
            request.description(),
            request.instructions(),
            "FILE_UPLOAD", // Default type
            request.maxScore(),
            request.dueDate() != null ? java.time.Instant.parse(request.dueDate()) : null,
            true,
            request.distributionType(),
            request.studentIds()
        );
        
        // Use UseCase or Repository directly? UseCase expects lessonId but we relaxed it.
        // We need to inject CreateAssignmentUseCaseV3
        java.util.UUID id = createAssignmentUseCaseV3.execute(command);
        return ResponseEntity.ok(ApiResponse.success(id, "Assignment created"));
    }
    
    @org.springframework.web.bind.annotation.PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR', 'ADMIN')")
    @Operation(summary = "Update assignment")
    public ResponseEntity<ApiResponse<Void>> updateAssignment(
            @PathVariable java.util.UUID id,
            @org.springframework.web.bind.annotation.RequestBody UpdateAssignmentRequest request
    ) {
        var assignment = assignmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assignment not found"));
                
        if (request.title() != null) assignment.setTitle(request.title());
        if (request.description() != null) assignment.setDescription(request.description());
        if (request.instructions() != null) assignment.setInstructions(request.instructions());
        
        if (request.dueDate() != null) {
            assignment.setDueDate(java.time.Instant.parse(request.dueDate()));
        }
        
        assignmentRepository.save(assignment);
        return ResponseEntity.ok(ApiResponse.success(null, "Assignment updated"));
    }
    
    @org.springframework.web.bind.annotation.DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR', 'ADMIN')")
    @Operation(summary = "Delete assignment")
    public ResponseEntity<ApiResponse<Void>> deleteAssignment(
            @PathVariable java.util.UUID id
    ) {
        deleteAssignmentUseCaseV3.execute(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Assignment deleted"));
    }

    public record CreateAssignmentRequest(
        String title,
        String description,
        String instructions,
        String dueDate,
        Integer maxScore,
        String distributionType,
        java.util.List<java.util.UUID> studentIds
    ) {}
    
    public record UpdateAssignmentRequest(
        String title,
        String description,
        String instructions,
        String dueDate,
        Integer maxScore
    ) {}
}

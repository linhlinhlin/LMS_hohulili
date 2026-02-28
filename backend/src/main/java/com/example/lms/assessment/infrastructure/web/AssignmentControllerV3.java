package com.example.lms.assessment.infrastructure.web;

import com.example.lms.assessment.application.usecase.GetTeacherAssignmentsSummaryUseCase;
import com.example.lms.assessment.application.usecase.GetAssignmentsByCourseUseCase;
import com.example.lms.assessment.application.dto.CreateAssignmentCommand;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v3/teacher/assignments")
@RequiredArgsConstructor
@Tag(name = "Teacher - Assignments", description = "Endpoints for teachers to manage assignments")
public class AssignmentControllerV3 {

    private final GetTeacherAssignmentsSummaryUseCase getTeacherAssignmentsSummaryUseCase;
    private final GetAssignmentsByCourseUseCase getAssignmentsByCourseUseCase;
    private final com.example.lms.assessment.infrastructure.persistence.repository.AssignmentJpaRepository assignmentRepository;
    private final com.example.lms.assessment.application.usecase.CreateAssignmentUseCaseV3 createAssignmentUseCaseV3;
    private final com.example.lms.assessment.application.usecase.DeleteAssignmentUseCaseV3 deleteAssignmentUseCaseV3;
    private final com.example.lms.assessment.application.usecase.UpdateAssignmentUseCaseV3 updateAssignmentUseCaseV3;
    private final JpaCourseRepository courseJpaRepository;

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Get summary of all assignments for the current teacher")
    public ResponseEntity<ApiResponse<Object>> getTeacherAssignmentsSummary(
            @AuthenticationPrincipal UserJpaEntity user) {
        
        var summary = getTeacherAssignmentsSummaryUseCase.execute(user.getId());
        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @GetMapping("/courses/{courseId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Get assignments for a specific course")
    public ResponseEntity<ApiResponse<Object>> getAssignmentsByCourse(
            @PathVariable java.util.UUID courseId,
            @AuthenticationPrincipal UserJpaEntity user) {
        verifyCourseOwnership(courseId, user);
        var result = getAssignmentsByCourseUseCase.execute(courseId);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    // === CRUD Operations for V3 ===

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Get assignment detail by ID")
    public ResponseEntity<ApiResponse<com.example.lms.assessment.application.dto.AssignmentDTOs.AssignmentDetail>> getAssignmentById(
            @PathVariable java.util.UUID id,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        return assignmentRepository.findById(id)
                .map(a -> {
                    // P0-8: Verify teacher ownership
                    verifyAssignmentOwnership(a, user);
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
                    return ResponseEntity.ok(ApiResponse.success(dto, "Thông tin bài tập"));
                })
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Bài tập", id));
    }

    @PostMapping("/courses/{courseId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Create new assignment")
    public ResponseEntity<ApiResponse<java.util.UUID>> createAssignment(
            @PathVariable java.util.UUID courseId,
            @Valid @RequestBody CreateAssignmentRequest request,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        // P0-8: Verify teacher ownership of the course
        verifyCourseOwnership(courseId, user);
        java.time.Instant dueDate = null;
        if (request.dueDate() != null) {
            try {
                dueDate = java.time.Instant.parse(request.dueDate());
            } catch (java.time.format.DateTimeParseException e) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Định dạng ngày hết hạn không hợp lệ"));
            }
        }
        var command = new CreateAssignmentCommand(
            null, // lessonId is optional now
            courseId,
            request.title(),
            request.description(),
            request.instructions(),
            "FILE_UPLOAD", // Default type
            request.maxScore(),
            dueDate,
            true,
            request.distributionType(),
            request.studentIds()
        );
        
        // Use UseCase or Repository directly? UseCase expects lessonId but we relaxed it.
        // We need to inject CreateAssignmentUseCaseV3
        java.util.UUID id = createAssignmentUseCaseV3.execute(command);
        return ResponseEntity.ok(ApiResponse.success(id, "Tạo bài tập thành công"));
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Update assignment")
    public ResponseEntity<ApiResponse<Void>> updateAssignment(
            @PathVariable java.util.UUID id,
            @Valid @RequestBody UpdateAssignmentRequest request,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        // P0-8: Verify teacher ownership
        var assignmentOpt = assignmentRepository.findById(id);
        if (assignmentOpt.isEmpty()) {
            throw new com.example.lms.shared.exception.EntityNotFoundException("Assignment", id);
        }
        verifyAssignmentOwnership(assignmentOpt.get(), user);
        var command = new com.example.lms.assessment.application.usecase.UpdateAssignmentUseCaseV3.Command(
                request.title(),
                request.description(),
                request.instructions(),
                request.dueDate(),
                request.maxScore()
        );
        updateAssignmentUseCaseV3.execute(id, command);
        return ResponseEntity.ok(ApiResponse.success(null, "Cập nhật bài tập thành công"));
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Delete assignment")
    public ResponseEntity<ApiResponse<Void>> deleteAssignment(
            @PathVariable java.util.UUID id,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        // P0-8: Verify teacher ownership
        var assignmentOpt2 = assignmentRepository.findById(id);
        if (assignmentOpt2.isEmpty()) {
            throw new com.example.lms.shared.exception.EntityNotFoundException("Assignment", id);
        }
        verifyAssignmentOwnership(assignmentOpt2.get(), user);
        deleteAssignmentUseCaseV3.execute(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Xóa bài tập thành công"));
    }

    public record CreateAssignmentRequest(
        @NotBlank(message = "Tiêu đề không được để trống")
        String title,
        String description,
        String instructions,
        String dueDate,
        @Positive(message = "Điểm tối đa phải là số dương")
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

    // === Ownership Helpers ===

    private boolean isAdminRole(UserJpaEntity user) {
        return user.getRole() == UserJpaEntity.UserRole.ADMIN
            || user.getRole() == UserJpaEntity.UserRole.ORG_ADMIN;
    }

    private void verifyCourseOwnership(java.util.UUID courseId, UserJpaEntity user) {
        if (isAdminRole(user)) return;
        var course = courseJpaRepository.findById(courseId)
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Course", courseId));
        if (course.getTeacherId() == null || !course.getTeacherId().equals(user.getId())) {
            throw new AccessDeniedException("Bạn không sở hữu khóa học này");
        }
    }

    private void verifyAssignmentOwnership(
            com.example.lms.assessment.infrastructure.persistence.entity.AssignmentJpaEntity assignment,
            UserJpaEntity user) {
        if (isAdminRole(user)) return;
        verifyCourseOwnership(assignment.getCourseId(), user);
    }
}

package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.learning_delivery.application.dto.DropStudentCommand;
import com.example.lms.learning_delivery.application.dto.EnrollmentResponse;
import com.example.lms.learning_delivery.application.dto.LearningClassResponse;
import com.example.lms.learning_delivery.application.usecase.*;
import com.example.lms.shared.domain.PageResponse;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.UUID;

/**
 * V3 Controller for Learning Classes (DDD - Learning Delivery Bounded Context).
 * Includes CRUD for classes + student enrollment management.
 *
 * CLEAN ARCHITECTURE: Controller only injects Use Cases, not repositories.
 */
@Tag(name = "Classes V3", description = "Learning class management endpoints")
@RestController
@RequestMapping("/api/v3/classes")
@RequiredArgsConstructor
public class ClassControllerV3 {

    private final CreateLearningClassUseCaseV3 createLearningClassUseCase;
    private final UpdateLearningClassUseCase updateLearningClassUseCase;
    private final DeleteLearningClassUseCase deleteLearningClassUseCase;
    private final GetLearningClassByIdUseCase getLearningClassByIdUseCase;
    private final EnrollStudentByEmailUseCase enrollStudentByEmailUseCase;
    private final GetClassStudentsUseCase getClassStudentsUseCase;
    private final DropStudentUseCase dropStudentUseCase;

    // ================================================================================================
    // Class CRUD Endpoints
    // ================================================================================================

    @Operation(summary = "Create a new learning class")
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<UUID>> createClass(
            @jakarta.validation.Valid @RequestBody CreateClassRequest request,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        // Auto-generate code if missing
        String classCode = request.getCode();
        if (classCode == null || classCode.isBlank()) {
            classCode = "CLS-" + UUID.randomUUID().toString().substring(0, 8);
        }

        // Determine teacher (defaults to creator if not specified)
        UUID teacherId = user.getId();
        if (request.getTeacherId() != null && !request.getTeacherId().isBlank()) {
            teacherId = UUID.fromString(request.getTeacherId());
        }

        var command = new CreateLearningClassUseCaseV3.CreateClassCommand(
                UUID.fromString(request.getCourseId()),
                teacherId,
                classCode,
                request.getName(),
                request.getStartDate() != null ? Instant.parse(request.getStartDate()) : null,
                request.getEndDate() != null ? Instant.parse(request.getEndDate()) : null,
                request.getMaxStudents(),
                request.getScheduleType(),
                request.getSemester()
        );

        UUID classId = createLearningClassUseCase.execute(command);

        return ResponseEntity.ok(ApiResponse.success(classId, "Class created successfully"));
    }

    @Operation(summary = "Update an existing learning class")
    @PutMapping("/{classId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<LearningClassResponse>> updateClass(
            @PathVariable String classId,
            @Valid @RequestBody UpdateClassRequest request
    ) {
        var command = new UpdateLearningClassUseCase.UpdateClassCommand(
                UUID.fromString(classId),
                request.getName(),
                request.getCode(),
                request.getStatus(),
                request.getMaxStudents(),
                request.getStartDate() != null ? Instant.parse(request.getStartDate()) : null,
                request.getEndDate() != null ? Instant.parse(request.getEndDate()) : null
        );

        LearningClassResponse response = updateLearningClassUseCase.execute(command);

        return ResponseEntity.ok(ApiResponse.success(response, "Class updated successfully"));
    }

    @Operation(summary = "Delete a learning class")
    @DeleteMapping("/{classId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Void>> deleteClass(
            @PathVariable String classId
    ) {
        deleteLearningClassUseCase.execute(UUID.fromString(classId));
        return ResponseEntity.ok(ApiResponse.success(null, "Class deleted successfully"));
    }

    @Operation(summary = "Get class by ID")
    @GetMapping("/{classId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<LearningClassResponse>> getClassById(
            @PathVariable String classId
    ) {
        LearningClassResponse response = getLearningClassByIdUseCase.execute(UUID.fromString(classId));
        return ResponseEntity.ok(ApiResponse.success(response, "Class loaded"));
    }

    // ================================================================================================
    // Student Enrollment Management Endpoints
    // ================================================================================================

    @Operation(summary = "Enroll student by email")
    @PostMapping("/{classId}/enrollments")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<UUID>> enrollStudent(
            @PathVariable String classId,
            @Valid @RequestBody EnrollStudentRequest request
    ) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new IllegalArgumentException("Email không được để trống");
        }

        UUID enrollmentId = enrollStudentByEmailUseCase.enroll(
                request.getEmail(),
                UUID.fromString(classId)
        );

        return ResponseEntity.ok(ApiResponse.success(enrollmentId, "Đã thêm học viên vào lớp"));
    }

    @Operation(summary = "Get students in class")
    @GetMapping("/{classId}/students")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<PageResponse<EnrollmentResponse>>> getClassStudents(
            @PathVariable String classId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "1000") int size
    ) {
        PageResponse<EnrollmentResponse> students = getClassStudentsUseCase.execute(
                UUID.fromString(classId),
                PageRequest.of(page, size)
        );

        return ResponseEntity.ok(ApiResponse.success(students, "Danh sách học viên"));
    }

    @Operation(summary = "Remove student from class")
    @DeleteMapping("/{classId}/enrollments/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Void>> removeStudent(
            @PathVariable String classId,
            @PathVariable String studentId
    ) {
        var command = new DropStudentCommand(
                UUID.fromString(studentId),
                UUID.fromString(classId),
                null
        );

        dropStudentUseCase.execute(command);

        return ResponseEntity.ok(ApiResponse.success(null, "Đã xóa học viên khỏi lớp"));
    }

    // ================================================================================================
    // Request DTOs
    // ================================================================================================

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateClassRequest {
        @jakarta.validation.constraints.NotBlank(message = "Tên lớp không được để trống")
        private String name;
        
        private String code; // Optional - auto generated if missing
        
        @jakarta.validation.constraints.NotBlank(message = "Course ID không được để trống")
        private String courseId;
        
        private String startDate;
        private String endDate;
        private Integer maxStudents;
        
        private String teacherId;
        private String scheduleType;
        private String semester;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateClassRequest {
        private String name;
        private String code;
        private String courseId;
        private String status;
        private String startDate;
        private String endDate;
        private Integer maxStudents;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EnrollStudentRequest {
        @jakarta.validation.constraints.NotBlank(message = "Email không được để trống")
        @jakarta.validation.constraints.Email(message = "Email không hợp lệ")
        private String email;
    }
}

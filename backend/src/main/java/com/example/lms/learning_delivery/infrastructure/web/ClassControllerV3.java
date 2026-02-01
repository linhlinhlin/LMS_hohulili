package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaLearningClassRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * V3 Controller for Learning Classes (DDD - Learning Delivery Bounded Context).
 * Includes CRUD for classes + student enrollment management.
 */
@Tag(name = "Classes V3", description = "Learning class management endpoints")
@RestController
@RequestMapping("/api/v3/classes")
@RequiredArgsConstructor
public class ClassControllerV3 {

    private final JpaLearningClassRepository classRepository;
    private final JpaEnrollmentRepository enrollmentRepository;
    private final UserJpaRepository userRepository;

    // ================================================================================================
    // Class CRUD Endpoints
    // ================================================================================================

    @Operation(summary = "Create a new learning class")
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<ClassResponse>> createClass(
            @jakarta.validation.Valid @RequestBody CreateClassRequest request,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        try {
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

            // Determine schedule type
            LearningClass.ScheduleType scheduleType = LearningClass.ScheduleType.CUSTOM;
            if (request.getScheduleType() != null) {
                try {
                    scheduleType = LearningClass.ScheduleType.valueOf(request.getScheduleType());
                } catch (IllegalArgumentException e) {
                    // default to CUSTOM
                }
            }

            LearningClass newClass = LearningClass.builder()
                    .id(UUID.randomUUID())
                    .courseId(UUID.fromString(request.getCourseId()))
                    .teacherId(teacherId)
                    .code(classCode)
                    .name(request.getName())
                    .status(LearningClass.ClassStatus.OPEN)
                    .maxStudents(request.getMaxStudents() != null ? request.getMaxStudents() : 50)
                    .startDate(request.getStartDate() != null ? Instant.parse(request.getStartDate()) : null)
                    .endDate(request.getEndDate() != null ? Instant.parse(request.getEndDate()) : null)
                    .scheduleType(scheduleType)
                    .semester(request.getSemester())
                    .createdAt(Instant.now())
                    .build();
            
            LearningClass saved = classRepository.save(newClass);
            ClassResponse response = toResponse(saved);
            
            return ResponseEntity.ok(ApiResponse.success(response, "Class created successfully"));
        } catch (Exception e) {
            e.printStackTrace();
            throw e;
        }
    }

    @Operation(summary = "Update an existing learning class")
    @PutMapping("/{classId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<ClassResponse>> updateClass(
            @PathVariable String classId,
            @RequestBody UpdateClassRequest request
    ) {
        return classRepository.findById(UUID.fromString(classId))
                .map(existing -> {
                    if (request.getName() != null) existing.setName(request.getName());
                    if (request.getCode() != null) existing.setCode(request.getCode());
                    if (request.getStatus() != null) {
                        existing.setStatus(LearningClass.ClassStatus.valueOf(request.getStatus()));
                    }
                    if (request.getMaxStudents() != null) existing.setMaxStudents(request.getMaxStudents());
                    if (request.getStartDate() != null) existing.setStartDate(Instant.parse(request.getStartDate()));
                    if (request.getEndDate() != null) existing.setEndDate(Instant.parse(request.getEndDate()));
                    existing.setUpdatedAt(Instant.now());
                    
                    LearningClass saved = classRepository.save(existing);
                    return ResponseEntity.ok(ApiResponse.success(toResponse(saved), "Class updated successfully"));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Delete a learning class")
    @DeleteMapping("/{classId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<String>> deleteClass(
            @PathVariable String classId
    ) {
        UUID uuid = UUID.fromString(classId);
        if (classRepository.existsById(uuid)) {
            classRepository.deleteById(uuid);
            return ResponseEntity.ok(ApiResponse.success("Deleted", "Class deleted successfully"));
        }
        return ResponseEntity.notFound().build();
    }

    @Operation(summary = "Get class by ID")
    @GetMapping("/{classId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<ClassResponse>> getClassById(
            @PathVariable String classId
    ) {
        return classRepository.findById(UUID.fromString(classId))
                .map(lc -> ResponseEntity.ok(ApiResponse.success(toResponse(lc), "Class loaded")))
                .orElse(ResponseEntity.notFound().build());
    }

    // ================================================================================================
    // Student Enrollment Management Endpoints
    // ================================================================================================

    @Operation(summary = "Enroll student by email")
    @PostMapping("/{classId}/enrollments")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Void>> enrollStudent(
            @PathVariable String classId,
            @RequestBody EnrollStudentRequest request
    ) {
        UUID classUuid = UUID.fromString(classId);
        
        // Verify class exists
        if (!classRepository.existsById(classUuid)) {
            return ResponseEntity.notFound().build();
        }
        
        // Find student by email
        UserJpaEntity student = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy học viên với email: " + request.getEmail()));
        
        // Check if already enrolled
        if (enrollmentRepository.existsByStudentIdAndClassId(student.getId(), classUuid)) {
            throw new RuntimeException("Học viên đã được ghi danh trong lớp này");
        }
        
        // Get the class
        LearningClass learningClass = classRepository.findById(classUuid).orElseThrow();
        
        // Create enrollment using builder pattern
        Enrollment enrollment = Enrollment.builder()
                .studentId(student.getId())
                .learningClass(learningClass)
                .status(Enrollment.EnrollmentStatus.ACTIVE)
                .completionPercent(0)
                .build();
        enrollmentRepository.save(enrollment);
        
        return ResponseEntity.ok(ApiResponse.success(null, "Đã thêm học viên vào lớp"));
    }

    @Operation(summary = "Get students in class")
    @GetMapping("/{classId}/students")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<List<StudentInClassResponse>>> getClassStudents(
            @PathVariable String classId
    ) {
        UUID classUuid = UUID.fromString(classId);
        
        // Verify class exists
        if (!classRepository.existsById(classUuid)) {
            return ResponseEntity.notFound().build();
        }
        
        // Get enrollments for this class
        var enrollments = enrollmentRepository.findByClassId(classUuid, PageRequest.of(0, 1000));
        
        List<StudentInClassResponse> students = enrollments.getContent().stream()
                .map(e -> {
                    // Lookup student info
                    return userRepository.findById(e.getStudentId())
                            .map(user -> StudentInClassResponse.builder()
                                    .id(user.getId().toString())
                                    .email(user.getEmail())
                                    .fullName(user.getFullName())
                                    .enrolledAt(e.getEnrolledAt() != null ? e.getEnrolledAt().toString() : null)
                                    .status(e.getStatus() != null ? e.getStatus().name() : "ACTIVE")
                                    .build())
                            .orElse(null);
                })
                .filter(s -> s != null)
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(ApiResponse.success(students, "Danh sách học viên"));
    }

    @Operation(summary = "Remove student from class")
    @DeleteMapping("/{classId}/enrollments/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Void>> removeStudent(
            @PathVariable String classId,
            @PathVariable String studentId
    ) {
        UUID classUuid = UUID.fromString(classId);
        UUID studentUuid = UUID.fromString(studentId);
        
        // Find and delete enrollment
        enrollmentRepository.findByStudentIdAndClassId(studentUuid, classUuid)
                .ifPresent(enrollment -> enrollmentRepository.delete(enrollment));
        
        return ResponseEntity.ok(ApiResponse.success(null, "Đã xóa học viên khỏi lớp"));
    }

    // ================================================================================================
    // Helper Methods & DTOs
    // ================================================================================================

    private ClassResponse toResponse(LearningClass lc) {
        long studentCount = enrollmentRepository.countByClassId(lc.getId());
        return ClassResponse.builder()
                .id(lc.getId().toString())
                .name(lc.getName())
                .code(lc.getCode())
                .courseId(lc.getCourseId() != null ? lc.getCourseId().toString() : null)
                .status(lc.getStatus() != null ? lc.getStatus().name() : "OPEN")
                .studentCount((int) studentCount)
                .startDate(lc.getStartDate() != null ? lc.getStartDate().toString() : null)
                .endDate(lc.getEndDate() != null ? lc.getEndDate().toString() : null)
                .teacherId(lc.getTeacherId() != null ? lc.getTeacherId().toString() : null)
                .createdAt(lc.getCreatedAt() != null ? lc.getCreatedAt().toString() : null)
                .updatedAt(lc.getUpdatedAt() != null ? lc.getUpdatedAt().toString() : null)
                .build();
    }

    // ----- Response DTOs -----

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClassResponse {
        private String id;
        private String name;
        private String code;
        private String courseId;
        private String courseName;
        private String status;
        private Integer studentCount;
        private String startDate;
        private String endDate;
        private String teacherId;
        private String teacherName;
        private String createdAt;
        private String updatedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudentInClassResponse {
        private String id;
        private String email;
        private String fullName;
        private String enrolledAt;
        private String status;
    }

    // ----- Request DTOs -----

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

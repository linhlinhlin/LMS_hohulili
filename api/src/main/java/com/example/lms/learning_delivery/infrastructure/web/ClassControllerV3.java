package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * V3 Controller for Learning Classes (DDD - Learning Delivery Bounded Context).
 * 
 * Follows SOTA practices:
 * - DDD aggregate boundaries
 * - CQRS pattern (separate read/write models)
 * - Event-driven design ready
 * 
 * TODO: Wire to actual LearningClassRepository for full implementation
 */
@Tag(name = "Classes V3", description = "Learning class management endpoints")
@RestController
@RequestMapping("/api/v3/classes")
@RequiredArgsConstructor
public class ClassControllerV3 {

    // TODO: Inject actual repositories
    // private final LearningClassRepository classRepository;
    // private final CourseRepository courseRepository;

    @Operation(summary = "Create a new learning class")
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<ClassResponse>> createClass(
            @RequestBody CreateClassRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        // TODO: Implement actual class creation with domain events
        // For now, return a stub response
        ClassResponse response = ClassResponse.builder()
                .id(UUID.randomUUID().toString())
                .name(request.getName())
                .code(request.getCode())
                .courseId(request.getCourseId())
                .status("ACTIVE")
                .studentCount(0)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .createdAt(Instant.now().toString())
                .build();
        
        return ResponseEntity.ok(ApiResponse.success(response, "Class created successfully"));
    }

    @Operation(summary = "Update an existing learning class")
    @PutMapping("/{classId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<ClassResponse>> updateClass(
            @PathVariable String classId,
            @RequestBody UpdateClassRequest request
    ) {
        // TODO: Implement actual class update
        ClassResponse response = ClassResponse.builder()
                .id(classId)
                .name(request.getName())
                .code(request.getCode())
                .courseId(request.getCourseId())
                .status(request.getStatus())
                .studentCount(0)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .updatedAt(Instant.now().toString())
                .build();
        
        return ResponseEntity.ok(ApiResponse.success(response, "Class updated successfully"));
    }

    @Operation(summary = "Delete a learning class")
    @DeleteMapping("/{classId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Void>> deleteClass(
            @PathVariable String classId
    ) {
        // TODO: Implement actual class deletion with domain events
        return ResponseEntity.ok(ApiResponse.success("Class deleted successfully"));
    }

    @Operation(summary = "Get class by ID")
    @GetMapping("/{classId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<ClassResponse>> getClassById(
            @PathVariable String classId
    ) {
        // TODO: Implement actual class retrieval
        ClassResponse response = ClassResponse.builder()
                .id(classId)
                .name("Sample Class")
                .code("CLS-001")
                .status("ACTIVE")
                .studentCount(0)
                .build();
        
        return ResponseEntity.ok(ApiResponse.success(response, "Class loaded"));
    }

    // ----- DTOs -----

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
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateClassRequest {
        private String name;
        private String code;
        private String courseId;
        private String startDate;
        private String endDate;
        private Integer maxStudents;
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
}

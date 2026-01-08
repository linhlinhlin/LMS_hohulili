package com.example.lms.course_management.infrastructure.web;

import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v3/teacher/courses")
@RequiredArgsConstructor
@Tag(name = "Teacher - Courses", description = "Endpoints for teachers to manage their courses")
public class TeacherCoursesControllerV3 {

    private final com.example.lms.course_management.application.usecase.CourseAuthoringUseCase courseAuthoringUseCase;
    private final com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository enrollmentRepository;
    private final com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository userRepository;

    @GetMapping("/my-courses")
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR', 'ADMIN')")
    @Operation(summary = "Get courses created by the current teacher")
    public ResponseEntity<ApiResponse<Page<com.example.lms.course_management.application.dto.CourseDTOs.TeacherCourseResponse>>> getMyCourses(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status
    ) {
        try {
            // Debug: Check if currentUser is null
            if (currentUser == null) {
                System.err.println("DEBUG: currentUser is NULL in getMyCourses");
                return ResponseEntity.badRequest().body(ApiResponse.error("AUTH_ERROR", "User not authenticated - currentUser is null"));
            }
            System.out.println("DEBUG: getMyCourses called for user: " + currentUser.getId() + " (" + currentUser.getEmail() + ")");
            
            PageRequest pageable = PageRequest.of(page, size);
            var response = courseAuthoringUseCase.getMyCourses(currentUser.getId(), pageable);
            
            System.out.println("DEBUG: getMyCourses returned " + response.getTotalElements() + " courses");
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            System.err.println("DEBUG ERROR in getMyCourses: " + e.getClass().getName() + " - " + e.getMessage());
            e.printStackTrace();
            // Return error details for debugging
            return ResponseEntity.status(500).body(ApiResponse.error("DEBUG_ERROR", 
                e.getClass().getSimpleName() + ": " + e.getMessage()));
        }
    }

    @GetMapping("/{courseId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<Object>> getCourseById(@PathVariable UUID courseId) {
        var draft = courseAuthoringUseCase.getCourseDraft(courseId);
        return ResponseEntity.ok(ApiResponse.success(draft));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<Object>> createCourse(
            @RequestBody com.example.lms.course_management.application.dto.CourseDTOs.CreateCourseRequest request,
            @AuthenticationPrincipal UserJpaEntity user) {
        var result = courseAuthoringUseCase.createCourse(request, user.getId());
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PutMapping("/{courseId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<Object>> updateCourse(
            @PathVariable UUID courseId,
            @RequestBody com.example.lms.course_management.application.dto.CourseDTOs.UpdateCourseRequest request) {
        courseAuthoringUseCase.updateCourse(courseId, request);
        return ResponseEntity.ok(ApiResponse.success("Success"));
    }

    @DeleteMapping("/{courseId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<Object>> deleteCourse(@PathVariable UUID courseId) {
        courseAuthoringUseCase.deleteCourse(courseId);
        return ResponseEntity.ok(ApiResponse.success("Success"));
    }

    @PostMapping("/{courseId}/submit-for-approval")
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<Object>> submitForApproval(@PathVariable UUID courseId) {
        courseAuthoringUseCase.submitForApproval(courseId);
        return ResponseEntity.ok(ApiResponse.success("Submitted"));
    }

    @PostMapping("/{courseId}/cancel-approval")
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<Object>> cancelApproval(@PathVariable UUID courseId) {
        courseAuthoringUseCase.cancelApproval(courseId);
        return ResponseEntity.ok(ApiResponse.success("Cancelled"));
    }

    @GetMapping("/{courseId}/review-status")
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<Object>> getReviewStatus(@PathVariable UUID courseId) {
        var status = courseAuthoringUseCase.getReviewStatus(courseId);
        return ResponseEntity.ok(ApiResponse.success(status));
    }
    @GetMapping("/{courseId}/students")
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR', 'ADMIN')")
    @Operation(summary = "Get enrolled students for a course")
    public ResponseEntity<ApiResponse<java.util.List<StudentInfoResponse>>> getCourseStudents(
            @PathVariable UUID courseId
    ) {
        // Find all enrollments for the course
        var enrollments = enrollmentRepository.findByLearningClass_CourseId(courseId);
        
        var studentIds = enrollments.stream()
                .map(com.example.lms.learning_delivery.domain.model.Enrollment::getStudentId)
                .collect(java.util.stream.Collectors.toSet());
        
        var studentMap = userRepository.findAllById(studentIds).stream()
                .collect(java.util.stream.Collectors.toMap(UserJpaEntity::getId, u -> u));
        
        var response = enrollments.stream()
                .map(e -> {
                    String fullName = "Unknown";
                    String email = "Unknown";
                    
                    UserJpaEntity user = studentMap.get(e.getStudentId());
                    if (user != null) {
                        fullName = user.getFullName();
                        email = user.getEmail();
                    }
                    
                    return StudentInfoResponse.builder()
                        .id(e.getStudentId().toString())
                        .fullName(fullName)
                        .email(email)
                        .enrolledAt(e.getJoinedAt() != null ? e.getJoinedAt().toString() : null)
                        .progressPercentage(e.getCompletionPercent())
                        .build();
                })
                .collect(java.util.stream.Collectors.toMap(StudentInfoResponse::getId, p -> p, (p, q) -> p))
                .values().stream().toList();

        return ResponseEntity.ok(ApiResponse.success(response, "Students loaded"));
    }

    @lombok.Builder
    @lombok.Data
    public static class StudentInfoResponse {
        private String id;
        private String fullName;
        private String email;
        private String enrolledAt;
        private Integer progressPercentage;
    }
}

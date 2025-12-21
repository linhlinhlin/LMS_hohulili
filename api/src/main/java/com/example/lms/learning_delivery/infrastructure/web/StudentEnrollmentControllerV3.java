package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaLearningClassRepository;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * V3 Controller for Student Enrollment queries.
 * Provides endpoints for students to view their enrolled courses.
 */
@Tag(name = "Student Enrollment V3", description = "Student enrollment query endpoints")
@RestController
@RequestMapping("/api/v3")
@RequiredArgsConstructor
public class StudentEnrollmentControllerV3 {

    private final JpaEnrollmentRepository enrollmentRepository;
    private final JpaLearningClassRepository learningClassRepository;

    @Operation(summary = "Get student's enrolled courses")
    @GetMapping("/courses/enrolled-courses")
    // @PreAuthorize("isAuthenticated()") - TEMP DISABLED for debugging
    public ResponseEntity<ApiResponse<Page<EnrolledCourseResponse>>> getEnrolledCourses(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit
    ) {
        System.out.println("📚 [enrolled-courses] Endpoint reached!");
        
        // Get user from SecurityContext - this is how Spring Security works
        Object principal = null;
        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            System.out.println("📚 [enrolled-courses] principal class: " + principal.getClass().getName());
        } else {
            System.out.println("📚 [enrolled-courses] No Authentication in SecurityContext!");
        }
        
        if (!(principal instanceof UserJpaEntity)) {
            System.out.println("📚 [enrolled-courses] Principal is NOT UserJpaEntity, returning empty");
            return ResponseEntity.ok(ApiResponse.success(
                new PageImpl<>(Collections.emptyList(), PageRequest.of(0, limit), 0),
                "User not authenticated properly"
            ));
        }
        
        UserJpaEntity currentUser = (UserJpaEntity) principal;
        System.out.println("📚 [enrolled-courses] currentUser email: " + currentUser.getEmail());
        
        UUID studentId = currentUser.getId();
        
        // Get all enrollments for this student
        List<Enrollment> enrollments = enrollmentRepository.findActiveByStudentId(studentId);
        
        // Get all class IDs from enrollments
        Set<UUID> classIds = enrollments.stream()
                .map(Enrollment::getClassId)
                .collect(Collectors.toSet());
        
        // Get all learning classes
        List<LearningClass> classes = learningClassRepository.findAllById(classIds);
        
        // Map class ID to LearningClass for quick lookup
        Map<UUID, LearningClass> classMap = classes.stream()
                .collect(Collectors.toMap(LearningClass::getId, c -> c));
        
        // Group enrollments by courseId
        Map<UUID, List<Enrollment>> courseEnrollments = new HashMap<>();
        for (Enrollment e : enrollments) {
            LearningClass lc = classMap.get(e.getClassId());
            if (lc != null) {
                courseEnrollments.computeIfAbsent(lc.getCourseId(), k -> new ArrayList<>()).add(e);
            }
        }
        
        // Build response with unique courses
        List<EnrolledCourseResponse> courseResponses = courseEnrollments.entrySet().stream()
                .map(entry -> {
                    UUID courseId = entry.getKey();
                    Enrollment enrollment = entry.getValue().get(0); // Get first enrollment
                    LearningClass lc = classMap.get(enrollment.getClassId());
                    
                    return EnrolledCourseResponse.builder()
                            .id(courseId.toString())
                            .title(lc != null ? lc.getName() : "Course")
                            .description("Khóa học")
                            .teacherName(lc != null ? "Giảng viên" : "Unknown")
                            .status(enrollment.getStatus().name().toLowerCase())
                            .progress(enrollment.getCompletionPercent() != null ? enrollment.getCompletionPercent() : 0)
                            .enrolledAt(enrollment.getEnrolledAt() != null ? enrollment.getEnrolledAt().toString() : null)
                            .build();
                })
                .collect(Collectors.toList());
        
        // Apply pagination manually
        int startIndex = (page - 1) * limit;
        int endIndex = Math.min(startIndex + limit, courseResponses.size());
        List<EnrolledCourseResponse> pageContent = startIndex < courseResponses.size() 
                ? courseResponses.subList(startIndex, endIndex) 
                : Collections.emptyList();
        
        PageRequest pageable = PageRequest.of(page - 1, limit);
        Page<EnrolledCourseResponse> pageResult = new PageImpl<>(pageContent, pageable, courseResponses.size());
        
        return ResponseEntity.ok(ApiResponse.success(pageResult, "Loaded enrolled courses"));
    }

    @Operation(summary = "Get course progress for student")
    @GetMapping("/student/progress/courses/{courseId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<CourseProgressResponse>> getCourseProgress(
            @PathVariable UUID courseId
    ) {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        
        if (!(principal instanceof UserJpaEntity)) {
            return ResponseEntity.ok(ApiResponse.success(
                CourseProgressResponse.builder()
                    .courseId(courseId.toString())
                    .progressPercentage(0)
                    .status("not_authenticated")
                    .build(),
                "User not authenticated properly"
            ));
        }
        
        UserJpaEntity currentUser = (UserJpaEntity) principal;
        UUID studentId = currentUser.getId();
        
        // Find learning classes for this course
        List<LearningClass> classes = learningClassRepository.findByCourseId(courseId);
        
        // Find enrollment for this student in any of these classes
        Optional<Enrollment> enrollmentOpt = Optional.empty();
        for (LearningClass lc : classes) {
            Optional<Enrollment> e = enrollmentRepository.findByStudentIdAndClassId(studentId, lc.getId());
            if (e.isPresent()) {
                enrollmentOpt = e;
                break;
            }
        }
        
        if (enrollmentOpt.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(
                CourseProgressResponse.builder()
                    .courseId(courseId.toString())
                    .progressPercentage(0)
                    .status("not_enrolled")
                    .build(),
                "Not enrolled in this course"
            ));
        }
        
        Enrollment enrollment = enrollmentOpt.get();
        
        CourseProgressResponse progress = CourseProgressResponse.builder()
                .courseId(courseId.toString())
                .progressPercentage(enrollment.getCompletionPercent() != null ? enrollment.getCompletionPercent() : 0)
                .status(enrollment.getStatus().name().toLowerCase())
                .completedLessons(enrollment.getProgress() != null ? enrollment.getProgress().size() : 0)
                .totalLessons(10) // TODO: Get from course content
                .lastAccessedAt(enrollment.getLastAccessedAt() != null ? enrollment.getLastAccessedAt().toString() : null)
                .build();
        
        return ResponseEntity.ok(ApiResponse.success(progress, "Course progress loaded"));
    }

    @Operation(summary = "Get completed lesson IDs for a course")
    @GetMapping("/student/progress/courses/{courseId}/completed-ids")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<String>>> getCompletedLessonIds(
            @PathVariable UUID courseId
    ) {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        
        if (!(principal instanceof UserJpaEntity)) {
            return ResponseEntity.ok(ApiResponse.success(List.of(), "User not authenticated properly"));
        }
        
        UserJpaEntity currentUser = (UserJpaEntity) principal;
        UUID studentId = currentUser.getId();
        
        // Find learning classes for this course
        List<LearningClass> classes = learningClassRepository.findByCourseId(courseId);
        
        // Find enrollment for this student in any of these classes
        for (LearningClass lc : classes) {
            Optional<Enrollment> enrollmentOpt = enrollmentRepository.findByStudentIdAndClassId(studentId, lc.getId());
            if (enrollmentOpt.isPresent()) {
                Enrollment enrollment = enrollmentOpt.get();
                // Return completed lesson IDs from progress field (Map keys)
                List<String> completedIds = enrollment.getProgress() != null 
                    ? new ArrayList<>(enrollment.getProgress().keySet())
                    : List.of();
                return ResponseEntity.ok(ApiResponse.success(completedIds, "Completed lesson IDs loaded"));
            }
        }
        
        // Not enrolled - return empty list
        return ResponseEntity.ok(ApiResponse.success(List.of(), "Not enrolled in this course"));
    }

    // Response DTOs
    @lombok.Builder
    @lombok.Data
    public static class EnrolledCourseResponse {
        private String id;
        private String title;
        private String description;
        private String teacherName;
        private String thumbnailUrl;
        private String status;
        private Integer progress;
        private String enrolledAt;
        private String createdAt;
    }

    @lombok.Builder
    @lombok.Data
    public static class CourseProgressResponse {
        private String courseId;
        private Integer progressPercentage;
        private String status;
        private Integer completedLessons;
        private Integer totalLessons;
        private String lastAccessedAt;
    }
}

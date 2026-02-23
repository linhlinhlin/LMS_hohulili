package com.example.lms.course_authoring.infrastructure.web;

import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CategoryJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CategoryJpaRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.shared.infrastructure.persistence.repository.PaymentTransactionJpaRepository;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Admin Courses Controller V3
 *
 * Provides endpoints for admin to manage all courses in the system.
 * Enriches course data with teacher info, category name, and enrollment counts.
 */
@RestController
@RequestMapping("/api/v3/admin/courses")
@RequiredArgsConstructor
@Tag(name = "Admin - Courses", description = "Admin course management endpoints")
public class AdminCoursesControllerV3 {

    private final CourseRepository courseRepository;
    private final UserJpaRepository userRepository;
    private final CategoryJpaRepository categoryRepository;
    private final JpaEnrollmentRepository enrollmentRepository;
    private final PaymentTransactionJpaRepository paymentTransactionRepository;

    @Operation(summary = "Get all courses with pagination and filtering")
    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<Page<CourseAdminResponse>>> getAllCourses(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search
    ) {
        PageRequest pageable = PageRequest.of(page, Math.min(size, 100));

        Page<Course> courses;
        if (status != null && !status.isBlank() && search != null && !search.isBlank()) {
            try {
                Course.CourseStatus courseStatus = Course.CourseStatus.valueOf(status.toUpperCase());
                courses = courseRepository.findByStatusAndTitleContaining(courseStatus, search, pageable);
            } catch (IllegalArgumentException e) {
                courses = courseRepository.findAll(pageable);
            }
        } else if (status != null && !status.isBlank()) {
            try {
                Course.CourseStatus courseStatus = Course.CourseStatus.valueOf(status.toUpperCase());
                courses = courseRepository.findByStatus(courseStatus, pageable);
            } catch (IllegalArgumentException e) {
                courses = courseRepository.findAll(pageable);
            }
        } else if (search != null && !search.isBlank()) {
            courses = courseRepository.findByTitleContaining(search, pageable);
        } else {
            courses = courseRepository.findAll(pageable);
        }

        Page<CourseAdminResponse> response = enrichCourses(courses);
        return ResponseEntity.ok(ApiResponse.success(response, "Danh sách khóa học"));
    }

    @Operation(summary = "Get pending courses for review")
    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<Page<CourseAdminResponse>>> getPendingCourses(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        PageRequest pageable = PageRequest.of(page, Math.min(size, 100));
        Page<Course> courses = courseRepository.findByStatus(Course.CourseStatus.PENDING, pageable);
        Page<CourseAdminResponse> response = enrichCourses(courses);
        return ResponseEntity.ok(ApiResponse.success(response, "Danh sách khóa học chờ duyệt"));
    }

    @Operation(summary = "Get system analytics including courses, users, and enrollments")
    @GetMapping("/analytics")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<CourseAnalyticsResponse>> getCourseAnalytics() {
        long totalCourses = courseRepository.count();
        long pendingCourses = courseRepository.countByStatus(Course.CourseStatus.PENDING);
        long approvedCourses = courseRepository.countByStatus(Course.CourseStatus.APPROVED);
        long draftCourses = courseRepository.countByStatus(Course.CourseStatus.DRAFT);
        long rejectedCourses = courseRepository.countByStatus(Course.CourseStatus.REJECTED);

        long totalUsers = userRepository.count();
        long totalTeachers = userRepository.countByRole(UserJpaEntity.UserRole.TEACHER);
        long totalStudents = userRepository.countByRole(UserJpaEntity.UserRole.STUDENT);
        long totalAdmins = userRepository.countByRole(UserJpaEntity.UserRole.ADMIN)
                + userRepository.countByRole(UserJpaEntity.UserRole.ORG_ADMIN);
        long totalEnrollments = enrollmentRepository.count();

        // Revenue data from payment transactions
        BigDecimal totalRevenueBd = paymentTransactionRepository.sumTotalRevenue();
        double totalRevenue = totalRevenueBd != null ? totalRevenueBd.doubleValue() : 0.0;

        YearMonth currentMonth = YearMonth.now();
        Instant monthStart = currentMonth.atDay(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant monthEnd = currentMonth.plusMonths(1).atDay(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
        BigDecimal monthlyRevenueBd = paymentTransactionRepository.sumRevenueByDateRange(monthStart, monthEnd);
        double monthlyRevenue = monthlyRevenueBd != null ? monthlyRevenueBd.doubleValue() : 0.0;

        CourseAnalyticsResponse analytics = CourseAnalyticsResponse.builder()
                .totalCourses(totalCourses)
                .pendingCourses(pendingCourses)
                .publishedCourses(approvedCourses)
                .draftCourses(draftCourses)
                .rejectedCourses(rejectedCourses)
                .approvedCourses(approvedCourses)
                .totalUsers(totalUsers)
                .totalTeachers(totalTeachers)
                .totalStudents(totalStudents)
                .totalAdmins(totalAdmins)
                .totalEnrollments(totalEnrollments)
                .activeCourses(approvedCourses)
                .totalRevenue(totalRevenue)
                .monthlyRevenue(monthlyRevenue)
                .build();

        return ResponseEntity.ok(ApiResponse.success(analytics, "Dữ liệu phân tích"));
    }

    @Operation(summary = "Approve a course")
    @PatchMapping("/{courseId}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<CourseAdminResponse>> approveCourse(
            @PathVariable UUID courseId,
            @Valid @RequestBody(required = false) ApprovalRequest request,
            @AuthenticationPrincipal UserJpaEntity admin
    ) {
        UUID adminId = admin != null ? admin.getId() : UUID.randomUUID();
        String comment = request != null ? request.getComment() : "Đã duyệt";

        return courseRepository.findById(courseId)
                .map(course -> {
                    course.approve(adminId, comment);
                    courseRepository.save(course);
                    return ResponseEntity.ok(ApiResponse.success(toAdminResponse(course), "Đã duyệt khóa học"));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Reject a course")
    @PatchMapping("/{courseId}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<CourseAdminResponse>> rejectCourse(
            @PathVariable UUID courseId,
            @Valid @RequestBody RejectRequest request,
            @AuthenticationPrincipal UserJpaEntity admin
    ) {
        UUID adminId = admin != null ? admin.getId() : UUID.randomUUID();

        return courseRepository.findById(courseId)
                .map(course -> {
                    course.reject(adminId, request.getReason());
                    courseRepository.save(course);
                    return ResponseEntity.ok(ApiResponse.success(toAdminResponse(course), "Đã từ chối khóa học"));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Revoke course approval - move back to draft")
    @PatchMapping("/{courseId}/revoke")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<CourseAdminResponse>> revokeCourse(
            @PathVariable UUID courseId,
            @Valid @RequestBody(required = false) RejectRequest request,
            @AuthenticationPrincipal UserJpaEntity admin
    ) {
        return courseRepository.findById(courseId)
                .map(course -> {
                    String reason = request != null ? request.getReason() : "Bị thu hồi bởi quản trị viên";
                    UUID adminId = admin != null ? admin.getId() : UUID.randomUUID();
                    course.reject(adminId, reason);
                    courseRepository.save(course);
                    return ResponseEntity.ok(ApiResponse.success(toAdminResponse(course), "Đã thu hồi khóa học"));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Delete a course")
    @DeleteMapping("/{courseId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> deleteCourse(@PathVariable UUID courseId) {
        if (courseRepository.existsById(courseId)) {
            courseRepository.deleteById(courseId);
            return ResponseEntity.ok(ApiResponse.success("Đã xóa", "Khóa học đã được xóa thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    // === Helper Methods ===

    /**
     * Batch-enrich a page of courses with teacher names, category names, and enrollment counts.
     * Replaces N+1 individual queries with batch fetches.
     */
    private Page<CourseAdminResponse> enrichCourses(Page<Course> courses) {
        // Batch-fetch teacher names
        Set<UUID> teacherIds = courses.getContent().stream()
                .map(Course::getTeacherId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<UUID, UserJpaEntity> teacherMap = teacherIds.isEmpty() ? Map.of() :
                userRepository.findAllById(teacherIds).stream()
                        .collect(Collectors.toMap(UserJpaEntity::getId, u -> u));

        // Batch-fetch category names
        Set<UUID> categoryIds = courses.getContent().stream()
                .map(Course::getCategoryId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<UUID, String> categoryMap = categoryIds.isEmpty() ? Map.of() :
                categoryRepository.findAllById(categoryIds).stream()
                        .collect(Collectors.toMap(CategoryJpaEntity::getId, CategoryJpaEntity::getName));

        // Batch-fetch enrollment counts
        List<UUID> courseIds = courses.getContent().stream()
                .map(Course::getId).collect(Collectors.toList());
        Map<UUID, Long> enrollmentMap = new HashMap<>();
        if (!courseIds.isEmpty()) {
            List<Object[]> enrollmentCounts = enrollmentRepository.countEnrollmentsByCourseIds(courseIds);
            for (Object[] row : enrollmentCounts) {
                enrollmentMap.put((UUID) row[0], (Long) row[1]);
            }
        }

        return courses.map(course -> toAdminResponseBatch(course, teacherMap, categoryMap, enrollmentMap));
    }

    private CourseAdminResponse toAdminResponseBatch(Course course,
            Map<UUID, UserJpaEntity> teacherMap,
            Map<UUID, String> categoryMap,
            Map<UUID, Long> enrollmentMap) {
        String teacherName = null;
        String teacherEmail = null;
        if (course.getTeacherId() != null) {
            UserJpaEntity teacher = teacherMap.get(course.getTeacherId());
            if (teacher != null) {
                teacherName = teacher.getFullName();
                teacherEmail = teacher.getEmail();
            }
        }

        String categoryName = course.getCategoryId() != null ? categoryMap.get(course.getCategoryId()) : null;
        int enrolledCount = enrollmentMap.getOrDefault(course.getId(), 0L).intValue();

        return CourseAdminResponse.builder()
                .id(course.getId().toString())
                .code(course.getCode() != null ? course.getCode().getValue() : null)
                .title(course.getTitle())
                .description(course.getDescription())
                .category(categoryName)
                .price(course.getPrice() != null ? course.getPrice().doubleValue() : null)
                .thumbnail(course.getThumbnailUrl())
                .status(course.getStatus().name().toLowerCase())
                .teacherId(course.getTeacherId() != null ? course.getTeacherId().toString() : null)
                .teacherName(teacherName)
                .teacherEmail(teacherEmail)
                .enrolledCount(enrolledCount)
                .sectionsCount(course.getChapterCount())
                .lessonsCount(course.getTotalLessonCount())
                .rejectionReason(course.getReviewComment())
                .createdAt(course.getCreatedAt() != null ? course.getCreatedAt().toString() : null)
                .updatedAt(course.getUpdatedAt() != null ? course.getUpdatedAt().toString() : null)
                .approvedAt(course.getReviewedAt() != null ? course.getReviewedAt().toString() : null)
                .build();
    }

    /**
     * Single-course enrichment for approve/reject/revoke operations.
     */
    private CourseAdminResponse toAdminResponse(Course course) {
        String teacherName = null;
        String teacherEmail = null;
        if (course.getTeacherId() != null) {
            Optional<UserJpaEntity> teacher = userRepository.findById(course.getTeacherId());
            if (teacher.isPresent()) {
                teacherName = teacher.get().getFullName();
                teacherEmail = teacher.get().getEmail();
            }
        }

        String categoryName = null;
        if (course.getCategoryId() != null) {
            Optional<CategoryJpaEntity> category = categoryRepository.findById(course.getCategoryId());
            if (category.isPresent()) {
                categoryName = category.get().getName();
            }
        }

        int enrolledCount = 0;
        try {
            enrolledCount = enrollmentRepository.findByLearningClass_CourseId(course.getId()).size();
        } catch (org.springframework.dao.DataAccessException e) {
            // Enrollment count unavailable — default to 0
        }

        return CourseAdminResponse.builder()
                .id(course.getId().toString())
                .code(course.getCode() != null ? course.getCode().getValue() : null)
                .title(course.getTitle())
                .description(course.getDescription())
                .category(categoryName)
                .price(course.getPrice() != null ? course.getPrice().doubleValue() : null)
                .thumbnail(course.getThumbnailUrl())
                .status(course.getStatus().name().toLowerCase())
                .teacherId(course.getTeacherId() != null ? course.getTeacherId().toString() : null)
                .teacherName(teacherName)
                .teacherEmail(teacherEmail)
                .enrolledCount(enrolledCount)
                .sectionsCount(course.getChapterCount())
                .lessonsCount(course.getTotalLessonCount())
                .rejectionReason(course.getReviewComment())
                .createdAt(course.getCreatedAt() != null ? course.getCreatedAt().toString() : null)
                .updatedAt(course.getUpdatedAt() != null ? course.getUpdatedAt().toString() : null)
                .approvedAt(course.getReviewedAt() != null ? course.getReviewedAt().toString() : null)
                .build();
    }

    // === DTOs ===

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CourseAdminResponse {
        private String id;
        private String code;
        private String title;
        private String description;
        private String shortDescription;
        private String category;
        private String level;
        private String duration;
        private Double price;
        private String thumbnail;
        private String status;
        private String teacherId;
        private String teacherName;
        private String teacherEmail;
        private int enrolledCount;
        private int sectionsCount;
        private int lessonsCount;
        private int assignmentsCount;
        private double rating;
        private double revenue;
        private String createdAt;
        private String updatedAt;
        private String submittedAt;
        private String approvedAt;
        private String rejectionReason;
        private String reviewComment;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CourseAnalyticsResponse {
        private long totalCourses;
        private long pendingCourses;
        private long publishedCourses;
        private long approvedCourses;
        private long draftCourses;
        private long rejectedCourses;
        private long activeCourses;
        private double totalRevenue;
        private double monthlyRevenue;
        private long totalUsers;
        private long totalTeachers;
        private long totalStudents;
        private long totalAdmins;
        private long totalEnrollments;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class ApprovalRequest {
        @Size(max = 1000, message = "Nhận xét không được vượt quá 1000 ký tự")
        private String comment;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class RejectRequest {
        @NotBlank(message = "Lý do không được để trống")
        private String reason;
    }
}

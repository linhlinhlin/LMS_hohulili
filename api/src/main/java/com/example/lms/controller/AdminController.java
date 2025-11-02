package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.entity.Course;
import com.example.lms.entity.User;
import com.example.lms.service.AdminService;
import com.example.lms.repository.SectionRepository;
import com.example.lms.repository.AssignmentRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Tag(name = "Administration", description = "API quản trị hệ thống (Admin only)")
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "Bearer Authentication")
public class AdminController {

    private final AdminService adminService;
    private final SectionRepository sectionRepository;
    private final AssignmentRepository assignmentRepository;

    @GetMapping("/courses/pending")
    @Operation(summary = "Lấy danh sách khóa học chờ duyệt", description = "Admin lấy tất cả khóa học đang chờ duyệt")
    public ResponseEntity<ApiResponse<Page<PendingCourseSummary>>> getPendingCourses(
            @Parameter(description = "Số trang (bắt đầu từ 1)") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "Số lượng item trên mỗi trang") @RequestParam(defaultValue = "10") int limit
    ) {
        try {
            Pageable pageable = PageRequest.of(page - 1, limit);
            Page<Course> courses = adminService.getPendingCourses(pageable);
            
            Page<PendingCourseSummary> courseSummaries = courses.map(this::convertToPendingCourseSummary);
            
            return ResponseEntity.ok(ApiResponse.success(courseSummaries));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Lỗi khi lấy danh sách khóa học chờ duyệt: " + e.getMessage()));
        }
    }

    @PatchMapping("/courses/{courseId}/approve")
    @Operation(summary = "Duyệt khóa học", description = "Admin duyệt một khóa học")
    public ResponseEntity<ApiResponse<String>> approveCourse(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            adminService.approveCourse(courseId, currentUser);
            return ResponseEntity.ok(ApiResponse.success("Khóa học đã được duyệt"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PatchMapping("/courses/{courseId}/reject")
    @Operation(summary = "Từ chối khóa học", description = "Admin từ chối một khóa học kèm lý do")
    public ResponseEntity<ApiResponse<String>> rejectCourse(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody RejectCourseRequest request
    ) {
        try {
            adminService.rejectCourse(courseId, currentUser, request);
            return ResponseEntity.ok(ApiResponse.success("Khóa học đã bị từ chối"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/analytics")
    @Operation(summary = "Lấy dữ liệu phân tích hệ thống", description = "Admin lấy thống kê tổng quan toàn hệ thống")
    public ResponseEntity<ApiResponse<SystemAnalytics>> getSystemAnalytics() {
        try {
            Map<String, Object> analyticsData = adminService.getSystemAnalytics();
            SystemAnalytics analytics = SystemAnalytics.fromMap(analyticsData);
            return ResponseEntity.ok(ApiResponse.success(analytics));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Lỗi khi lấy dữ liệu phân tích: " + e.getMessage()));
        }
    }

    @GetMapping("/courses/all")
    @Operation(summary = "Lấy tất cả khóa học", description = "Admin lấy danh sách tất cả khóa học trong hệ thống")
    public ResponseEntity<ApiResponse<Page<AdminCourseSummary>>> getAllCourses(
            @Parameter(description = "Số trang (bắt đầu từ 1)") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "Số lượng item trên mỗi trang") @RequestParam(defaultValue = "10") int limit,
            @Parameter(description = "Lọc theo trạng thái") @RequestParam(required = false) String status,
            @Parameter(description = "Tìm kiếm theo tên khóa học") @RequestParam(required = false) String search
    ) {
        try {
            Pageable pageable = PageRequest.of(page - 1, limit);
            Page<Course> courses = adminService.getAllCourses(search, 
                status != null ? Course.CourseStatus.valueOf(status.toUpperCase()) : null, 
                pageable);
            
            Page<AdminCourseSummary> courseSummaries = courses.map(this::convertToAdminCourseSummary);
            
            return ResponseEntity.ok(ApiResponse.success(courseSummaries));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Lỗi khi lấy danh sách khóa học: " + e.getMessage()));
        }
    }

    // Helper methods
    private PendingCourseSummary convertToPendingCourseSummary(Course course) {
        return PendingCourseSummary.builder()
                .id(course.getId())
                .code(course.getCode())
                .title(course.getTitle())
                .description(course.getDescription())
                .teacherId(course.getTeacher().getId())
                .teacherName(course.getTeacher().getFullName())
                .teacherEmail(course.getTeacher().getEmail())
                .sectionsCount(Math.toIntExact(sectionRepository.countByCourseId(course.getId())))
                .submittedAt(course.getUpdatedAt() != null ? course.getUpdatedAt() : course.getCreatedAt())
                .createdAt(course.getCreatedAt())
                .build();
    }

    private AdminCourseSummary convertToAdminCourseSummary(Course course) {
        return AdminCourseSummary.builder()
                .id(course.getId())
                .code(course.getCode())
                .title(course.getTitle())
                .status(course.getStatus().name())
                .teacherName(course.getTeacher().getFullName())
                .enrolledCount(0) // TODO: Add count query for enrolled students
                .sectionsCount(Math.toIntExact(sectionRepository.countByCourseId(course.getId())))
                .assignmentsCount(Math.toIntExact(assignmentRepository.countByCourseId(course.getId())))
                .createdAt(course.getCreatedAt())
                .updatedAt(course.getUpdatedAt())
                .build();
    }

    // DTOs
    public static class PendingCourseSummary {
        private UUID id;
        private String code;
        private String title;
        private String description;
        private UUID teacherId;
        private String teacherName;
        private String teacherEmail;
        private int sectionsCount;
        private Instant submittedAt;
        private Instant createdAt;

        public static PendingCourseSummaryBuilder builder() {
            return new PendingCourseSummaryBuilder();
        }

        public static class PendingCourseSummaryBuilder {
            private UUID id;
            private String code;
            private String title;
            private String description;
            private UUID teacherId;
            private String teacherName;
            private String teacherEmail;
            private int sectionsCount;
            private Instant submittedAt;
            private Instant createdAt;

            public PendingCourseSummaryBuilder id(UUID id) { this.id = id; return this; }
            public PendingCourseSummaryBuilder code(String code) { this.code = code; return this; }
            public PendingCourseSummaryBuilder title(String title) { this.title = title; return this; }
            public PendingCourseSummaryBuilder description(String description) { this.description = description; return this; }
            public PendingCourseSummaryBuilder teacherId(UUID teacherId) { this.teacherId = teacherId; return this; }
            public PendingCourseSummaryBuilder teacherName(String teacherName) { this.teacherName = teacherName; return this; }
            public PendingCourseSummaryBuilder teacherEmail(String teacherEmail) { this.teacherEmail = teacherEmail; return this; }
            public PendingCourseSummaryBuilder sectionsCount(int sectionsCount) { this.sectionsCount = sectionsCount; return this; }
            public PendingCourseSummaryBuilder submittedAt(Instant submittedAt) { this.submittedAt = submittedAt; return this; }
            public PendingCourseSummaryBuilder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }

            public PendingCourseSummary build() {
                PendingCourseSummary course = new PendingCourseSummary();
                course.id = this.id;
                course.code = this.code;
                course.title = this.title;
                course.description = this.description;
                course.teacherId = this.teacherId;
                course.teacherName = this.teacherName;
                course.teacherEmail = this.teacherEmail;
                course.sectionsCount = this.sectionsCount;
                course.submittedAt = this.submittedAt;
                course.createdAt = this.createdAt;
                return course;
            }
        }

        // Getters
        public UUID getId() { return id; }
        public String getCode() { return code; }
        public String getTitle() { return title; }
        public String getDescription() { return description; }
        public UUID getTeacherId() { return teacherId; }
        public String getTeacherName() { return teacherName; }
        public String getTeacherEmail() { return teacherEmail; }
        public int getSectionsCount() { return sectionsCount; }
        public Instant getSubmittedAt() { return submittedAt; }
        public Instant getCreatedAt() { return createdAt; }
    }

    public static class AdminCourseSummary {
        private UUID id;
        private String code;
        private String title;
        private String status;
        private String teacherName;
        private int enrolledCount;
        private int sectionsCount;
        private int assignmentsCount;
        private Instant createdAt;
        private Instant updatedAt;

        public static AdminCourseSummaryBuilder builder() {
            return new AdminCourseSummaryBuilder();
        }

        public static class AdminCourseSummaryBuilder {
            private UUID id;
            private String code;
            private String title;
            private String status;
            private String teacherName;
            private int enrolledCount;
            private int sectionsCount;
            private int assignmentsCount;
            private Instant createdAt;
            private Instant updatedAt;

            public AdminCourseSummaryBuilder id(UUID id) { this.id = id; return this; }
            public AdminCourseSummaryBuilder code(String code) { this.code = code; return this; }
            public AdminCourseSummaryBuilder title(String title) { this.title = title; return this; }
            public AdminCourseSummaryBuilder status(String status) { this.status = status; return this; }
            public AdminCourseSummaryBuilder teacherName(String teacherName) { this.teacherName = teacherName; return this; }
            public AdminCourseSummaryBuilder enrolledCount(int enrolledCount) { this.enrolledCount = enrolledCount; return this; }
            public AdminCourseSummaryBuilder sectionsCount(int sectionsCount) { this.sectionsCount = sectionsCount; return this; }
            public AdminCourseSummaryBuilder assignmentsCount(int assignmentsCount) { this.assignmentsCount = assignmentsCount; return this; }
            public AdminCourseSummaryBuilder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
            public AdminCourseSummaryBuilder updatedAt(Instant updatedAt) { this.updatedAt = updatedAt; return this; }

            public AdminCourseSummary build() {
                AdminCourseSummary course = new AdminCourseSummary();
                course.id = this.id;
                course.code = this.code;
                course.title = this.title;
                course.status = this.status;
                course.teacherName = this.teacherName;
                course.enrolledCount = this.enrolledCount;
                course.sectionsCount = this.sectionsCount;
                course.assignmentsCount = this.assignmentsCount;
                course.createdAt = this.createdAt;
                course.updatedAt = this.updatedAt;
                return course;
            }
        }

        // Getters
        public UUID getId() { return id; }
        public String getCode() { return code; }
        public String getTitle() { return title; }
        public String getStatus() { return status; }
        public String getTeacherName() { return teacherName; }
        public int getEnrolledCount() { return enrolledCount; }
        public int getSectionsCount() { return sectionsCount; }
        public int getAssignmentsCount() { return assignmentsCount; }
        public Instant getCreatedAt() { return createdAt; }
        public Instant getUpdatedAt() { return updatedAt; }
    }

    public static class SystemAnalytics {
        private long totalUsers;
        private long totalTeachers;
        private long totalStudents;
        private long totalCourses;
        private long approvedCourses;
        private long pendingCourses;
        private long rejectedCourses;
        private long draftCourses;
        private long totalEnrollments;
        private long totalAssignments;
        private long totalSubmissions;
        private Map<String, Long> coursesByStatus;
        private Map<String, Long> usersByRole;
        private Map<String, Long> enrollmentsByMonth;

        public SystemAnalytics() {}

        public SystemAnalytics(long totalUsers, long totalTeachers, long totalStudents, 
                             long totalCourses, long approvedCourses, long pendingCourses,
                             long rejectedCourses, long draftCourses, long totalEnrollments,
                             long totalAssignments, long totalSubmissions,
                             Map<String, Long> coursesByStatus, Map<String, Long> usersByRole,
                             Map<String, Long> enrollmentsByMonth) {
            this.totalUsers = totalUsers;
            this.totalTeachers = totalTeachers;
            this.totalStudents = totalStudents;
            this.totalCourses = totalCourses;
            this.approvedCourses = approvedCourses;
            this.pendingCourses = pendingCourses;
            this.rejectedCourses = rejectedCourses;
            this.draftCourses = draftCourses;
            this.totalEnrollments = totalEnrollments;
            this.totalAssignments = totalAssignments;
            this.totalSubmissions = totalSubmissions;
            this.coursesByStatus = coursesByStatus;
            this.usersByRole = usersByRole;
            this.enrollmentsByMonth = enrollmentsByMonth;
        }

        // Getters and Setters
        public long getTotalUsers() { return totalUsers; }
        public void setTotalUsers(long totalUsers) { this.totalUsers = totalUsers; }
        public long getTotalTeachers() { return totalTeachers; }
        public void setTotalTeachers(long totalTeachers) { this.totalTeachers = totalTeachers; }
        public long getTotalStudents() { return totalStudents; }
        public void setTotalStudents(long totalStudents) { this.totalStudents = totalStudents; }
        public long getTotalCourses() { return totalCourses; }
        public void setTotalCourses(long totalCourses) { this.totalCourses = totalCourses; }
        public long getApprovedCourses() { return approvedCourses; }
        public void setApprovedCourses(long approvedCourses) { this.approvedCourses = approvedCourses; }
        public long getPendingCourses() { return pendingCourses; }
        public void setPendingCourses(long pendingCourses) { this.pendingCourses = pendingCourses; }
        public long getRejectedCourses() { return rejectedCourses; }
        public void setRejectedCourses(long rejectedCourses) { this.rejectedCourses = rejectedCourses; }
        public long getDraftCourses() { return draftCourses; }
        public void setDraftCourses(long draftCourses) { this.draftCourses = draftCourses; }
        public long getTotalEnrollments() { return totalEnrollments; }
        public void setTotalEnrollments(long totalEnrollments) { this.totalEnrollments = totalEnrollments; }
        public long getTotalAssignments() { return totalAssignments; }
        public void setTotalAssignments(long totalAssignments) { this.totalAssignments = totalAssignments; }
        public long getTotalSubmissions() { return totalSubmissions; }
        public void setTotalSubmissions(long totalSubmissions) { this.totalSubmissions = totalSubmissions; }
        public Map<String, Long> getCoursesByStatus() { return coursesByStatus; }
        public void setCoursesByStatus(Map<String, Long> coursesByStatus) { this.coursesByStatus = coursesByStatus; }
        public Map<String, Long> getUsersByRole() { return usersByRole; }
        public void setUsersByRole(Map<String, Long> usersByRole) { this.usersByRole = usersByRole; }
        public Map<String, Long> getEnrollmentsByMonth() { return enrollmentsByMonth; }
        public void setEnrollmentsByMonth(Map<String, Long> enrollmentsByMonth) { this.enrollmentsByMonth = enrollmentsByMonth; }
    
        public static SystemAnalytics fromMap(Map<String, Object> data) {
            SystemAnalytics analytics = new SystemAnalytics();
            analytics.totalUsers = ((Number) data.getOrDefault("totalUsers", 0)).longValue();
            analytics.totalTeachers = ((Number) data.getOrDefault("totalTeachers", 0)).longValue();
            analytics.totalStudents = ((Number) data.getOrDefault("totalStudents", 0)).longValue();
            analytics.totalCourses = ((Number) data.getOrDefault("totalCourses", 0)).longValue();
            analytics.approvedCourses = ((Number) data.getOrDefault("publishedCourses", 0)).longValue();
            analytics.pendingCourses = ((Number) data.getOrDefault("pendingCourses", 0)).longValue();
            analytics.rejectedCourses = ((Number) data.getOrDefault("rejectedCourses", 0)).longValue();
            analytics.draftCourses = ((Number) data.getOrDefault("draftCourses", 0)).longValue();
            analytics.totalAssignments = ((Number) data.getOrDefault("totalAssignments", 0)).longValue();
            return analytics;
        }
    }

    public static class RejectCourseRequest {
        @NotBlank(message = "Lý do từ chối không được để trống")
        private String reason;

        public RejectCourseRequest() {}

        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }

    public static class ReviewCourseRequest {
        @NotNull(message = "Quyết định duyệt không được để trống")
        private boolean approved;
        
        private String comment;

        public ReviewCourseRequest() {}

        public boolean isApproved() { return approved; }
        public void setApproved(boolean approved) { this.approved = approved; }
        public String getComment() { return comment; }
        public void setComment(String comment) { this.comment = comment; }
    }

    public static class UpdateUserRoleRequest {
        @NotNull(message = "Vai trò không được để trống")
        private User.Role role;

        public UpdateUserRoleRequest() {}

        public User.Role getRole() { return role; }
        public void setRole(User.Role role) { this.role = role; }
    }
}
package com.example.lms.course_authoring.infrastructure.web;

import com.example.lms.course_authoring.application.usecase.ApproveCourseUseCase;
import com.example.lms.course_authoring.application.usecase.RejectCourseUseCase;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseReviewEventJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CourseReviewEventJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseCategoryJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CourseCategoryJpaRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.infrastructure.persistence.repository.PaymentTransactionJpaRepository;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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
    private final CourseCategoryJpaRepository categoryRepository;
    private final JpaEnrollmentRepository enrollmentRepository;
    private final PaymentTransactionJpaRepository paymentTransactionRepository;
    private final ApproveCourseUseCase approveCourseUseCase;
    private final RejectCourseUseCase rejectCourseUseCase;
    private final CourseReviewEventJpaRepository reviewEventRepository;

    @Operation(summary = "Get all courses with pagination and filtering")
    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<Page<CourseAdminResponse>>> getAllCourses(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @AuthenticationPrincipal UserJpaEntity currentUser
    ) {
        PageRequest pageable = PageRequest.of(page, Math.min(size, 100),
                Sort.by(Sort.Order.asc("status"), Sort.Order.desc("createdAt")));
        Instant fromInstant = parseDate(fromDate, true);
        Instant toInstant = parseDate(toDate, false);
        boolean hasAdvancedFilters = categoryId != null || fromInstant != null || toInstant != null;

        Page<Course> courses;
        if (isOrgAdmin(currentUser)) {
            Set<UUID> orgTeacherIds = getOrgTeacherIds(currentUser.getOrganizationId());
            courses = hasAdvancedFilters
                    ? loadAndFilterOrgScopedCourses(orgTeacherIds, status, search, categoryId, fromInstant, toInstant, pageable)
                    : queryOrgScopedCourses(orgTeacherIds, status, search, pageable);
        } else {
            courses = queryCourses(status, search, pageable);
            if (hasAdvancedFilters) {
                List<Course> filtered = applyAdvancedFilters(courses.getContent(), categoryId, fromInstant, toInstant);
                courses = new PageImpl<>(filtered, pageable, filtered.size());
            }
        }

        Page<CourseAdminResponse> response = enrichCourses(courses);
        return ResponseEntity.ok(ApiResponse.success(response, "Danh sách khóa học"));
    }

    @Operation(summary = "Get pending courses for review")
    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<Page<CourseAdminResponse>>> getPendingCourses(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal UserJpaEntity currentUser
    ) {
        PageRequest pageable = PageRequest.of(page, Math.min(size, 100));
        Page<Course> courses = isOrgAdmin(currentUser)
                ? courseRepository.findReviewQueueByTeacherIds(getOrgTeacherIds(currentUser.getOrganizationId()), pageable)
                : courseRepository.findReviewQueue(pageable);

        Page<CourseAdminResponse> response = enrichCourses(courses);
        return ResponseEntity.ok(ApiResponse.success(response, "Danh sách khóa học chờ duyệt"));
    }

    @Operation(summary = "Get system analytics including courses, users, and enrollments")
    @GetMapping("/analytics")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<CourseAnalyticsResponse>> getCourseAnalytics(
            @AuthenticationPrincipal UserJpaEntity currentUser
    ) {
        CourseAnalyticsResponse analytics;

        if (isOrgAdmin(currentUser)) {
            analytics = buildOrgScopedAnalytics(currentUser);
        } else {
            analytics = buildSystemWideAnalytics();
        }

        return ResponseEntity.ok(ApiResponse.success(analytics, "Dữ liệu phân tích"));
    }

    /**
     * System-wide analytics for ADMIN — unchanged from original behavior.
     */
    private CourseAnalyticsResponse buildSystemWideAnalytics() {
        long totalCourses = courseRepository.count();
        long pendingCourses = courseRepository.countReviewQueue();
        long approvedCourses = courseRepository.countByStatus(Course.CourseStatus.APPROVED);
        long draftCourses = courseRepository.countByStatus(Course.CourseStatus.DRAFT);
        long rejectedCourses = courseRepository.countByStatus(Course.CourseStatus.REJECTED);

        long totalUsers = userRepository.count();
        long totalTeachers = userRepository.countByRole(UserJpaEntity.UserRole.TEACHER);
        long totalStudents = userRepository.countByRole(UserJpaEntity.UserRole.STUDENT);
        long totalAdmins = userRepository.countByRole(UserJpaEntity.UserRole.ADMIN)
                + userRepository.countByRole(UserJpaEntity.UserRole.ORG_ADMIN);
        long totalEnrollments = enrollmentRepository.count();

        BigDecimal totalRevenueBd = paymentTransactionRepository.sumTotalRevenue();
        double totalRevenue = totalRevenueBd != null ? totalRevenueBd.doubleValue() : 0.0;

        YearMonth currentMonth = YearMonth.now();
        Instant monthStart = currentMonth.atDay(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant monthEnd = currentMonth.plusMonths(1).atDay(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
        BigDecimal monthlyRevenueBd = paymentTransactionRepository.sumRevenueByDateRange(monthStart, monthEnd);
        double monthlyRevenue = monthlyRevenueBd != null ? monthlyRevenueBd.doubleValue() : 0.0;

        return CourseAnalyticsResponse.builder()
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
    }

    /**
     * Org-scoped analytics for ORG_ADMIN — only their organization's data.
     * Counts teachers/students/admins within org, courses by org teachers,
     * enrollments and revenue for those courses.
     */
    private CourseAnalyticsResponse buildOrgScopedAnalytics(UserJpaEntity currentUser) {
        UUID orgId = currentUser.getOrganizationId();

        // 1. Org members by role
        List<UserJpaEntity> orgMembers = orgId != null
                ? userRepository.findByOrganizationId(orgId)
                : List.of();
        long totalUsers = orgMembers.size();
        long totalTeachers = orgMembers.stream()
                .filter(u -> u.getRole() == UserJpaEntity.UserRole.TEACHER).count();
        long totalStudents = orgMembers.stream()
                .filter(u -> u.getRole() == UserJpaEntity.UserRole.STUDENT).count();
        long totalAdmins = orgMembers.stream()
                .filter(u -> u.getRole() == UserJpaEntity.UserRole.ADMIN
                        || u.getRole() == UserJpaEntity.UserRole.ORG_ADMIN).count();

        // 2. Org teacher IDs → course counts by status
        Set<UUID> orgTeacherIds = getOrgTeacherIds(orgId);
        long totalCourses;
        long pendingCourses;
        long approvedCourses;
        long draftCourses;
        long rejectedCourses;

        if (orgTeacherIds.isEmpty()) {
            totalCourses = 0;
            pendingCourses = 0;
            approvedCourses = 0;
            draftCourses = 0;
            rejectedCourses = 0;
        } else {
            totalCourses = courseRepository.countByTeacherIdIn(orgTeacherIds);
            pendingCourses = courseRepository.countReviewQueueByTeacherIds(orgTeacherIds);
            approvedCourses = courseRepository.countByStatusAndTeacherIdIn(Course.CourseStatus.APPROVED, orgTeacherIds);
            draftCourses = courseRepository.countByStatusAndTeacherIdIn(Course.CourseStatus.DRAFT, orgTeacherIds);
            rejectedCourses = courseRepository.countByStatusAndTeacherIdIn(Course.CourseStatus.REJECTED, orgTeacherIds);
        }

        // 3. Org course IDs → enrollment count + revenue
        List<UUID> orgCourseIds = orgTeacherIds.isEmpty()
                ? List.of()
                : courseRepository.findCourseIdsByTeacherIdIn(orgTeacherIds);

        long totalEnrollments = 0;
        double totalRevenue = 0.0;
        double monthlyRevenue = 0.0;

        if (!orgCourseIds.isEmpty()) {
            totalEnrollments = enrollmentRepository.countTotalByCourseIds(orgCourseIds);

            BigDecimal totalRevenueBd = paymentTransactionRepository.sumRevenueByCourseIds(orgCourseIds);
            totalRevenue = totalRevenueBd != null ? totalRevenueBd.doubleValue() : 0.0;

            YearMonth currentMonth = YearMonth.now();
            Instant monthStart = currentMonth.atDay(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
            Instant monthEnd = currentMonth.plusMonths(1).atDay(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
            BigDecimal monthlyRevenueBd = paymentTransactionRepository.sumRevenueByCourseIdsAndDateRange(
                    orgCourseIds, monthStart, monthEnd);
            monthlyRevenue = monthlyRevenueBd != null ? monthlyRevenueBd.doubleValue() : 0.0;
        }

        return CourseAnalyticsResponse.builder()
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
    }

    @Operation(summary = "Approve a course")
    @PatchMapping("/{courseId}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<CourseAdminResponse>> approveCourse(
            @PathVariable UUID courseId,
            @Valid @RequestBody(required = false) ApprovalRequest request,
            @AuthenticationPrincipal UserJpaEntity admin
    ) {
        String comment = request != null ? request.getComment() : "Đã duyệt";
        // ORG_ADMIN: verify course teacher is in their org
        verifyCourseOrgAccess(courseId, admin);
        // Delegate to use case — publishes CourseApprovedEvent domain events
        approveCourseUseCase.execute(courseId, admin.getId(), comment);
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", courseId));
        return ResponseEntity.ok(ApiResponse.success(toAdminResponse(course), "Đã duyệt khóa học"));
    }

    @Operation(summary = "Reject a course")
    @PatchMapping("/{courseId}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<CourseAdminResponse>> rejectCourse(
            @PathVariable UUID courseId,
            @Valid @RequestBody RejectRequest request,
            @AuthenticationPrincipal UserJpaEntity admin
    ) {
        // ORG_ADMIN: verify course teacher is in their org
        verifyCourseOrgAccess(courseId, admin);
        // Delegate to use case for proper domain layer handling
        com.example.lms.course_authoring.domain.model.CourseRejectionCategory category =
                com.example.lms.course_authoring.domain.model.CourseRejectionCategory
                        .fromStringOrOther(request.getCategory());
        rejectCourseUseCase.execute(courseId, admin.getId(), request.getReason(), category);
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", courseId));
        return ResponseEntity.ok(ApiResponse.success(toAdminResponse(course), "Đã từ chối khóa học"));
    }

    @Operation(summary = "Revoke course approval - move back to draft")
    @PatchMapping("/{courseId}/revoke")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<CourseAdminResponse>> revokeCourse(
            @PathVariable UUID courseId,
            @Valid @RequestBody(required = false) RejectRequest request,
            @AuthenticationPrincipal UserJpaEntity admin
    ) {
        String reason = request != null ? request.getReason() : "Bị thu hồi bởi quản trị viên";
        // ORG_ADMIN: verify course teacher is in their org
        verifyCourseOrgAccess(courseId, admin);
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", courseId));
        course.revoke(admin.getId(), reason);
        courseRepository.save(course);

        reviewEventRepository.save(CourseReviewEventJpaEntity.builder()
                .courseId(courseId)
                .reviewerId(admin.getId())
                .action("REVOKED")
                .comment(reason)
                .build());

        return ResponseEntity.ok(ApiResponse.success(toAdminResponse(course), "Đã thu hồi khóa học"));
    }

    @Operation(summary = "Get review history for a course")
    @GetMapping("/{courseId}/review-history")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<List<ReviewEventResponse>>> getReviewHistory(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal UserJpaEntity admin
    ) {
        verifyCourseOrgAccess(courseId, admin);
        var events = reviewEventRepository.findByCourseIdOrderByCreatedAtDesc(courseId);
        var responses = events.stream().map(e -> {
            String reviewerName = null;
            if (e.getReviewerId() != null) {
                reviewerName = userRepository.findById(e.getReviewerId())
                        .map(UserJpaEntity::getFullName)
                        .orElse(null);
            }
            return new ReviewEventResponse(
                    e.getId(), e.getAction(), e.getComment(),
                    e.getReviewerId(), reviewerName, e.getCreatedAt()
            );
        }).toList();
        return ResponseEntity.ok(ApiResponse.success(responses, "Lịch sử phê duyệt"));
    }

    @Operation(summary = "Bulk approve courses")
    @PatchMapping("/bulk-approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<BulkActionResponse>> bulkApproveCourses(
            @RequestBody @Valid BulkApproveRequest request,
            @AuthenticationPrincipal UserJpaEntity admin
    ) {
        List<UUID> courseIds = request.getCourseIds();
        if (courseIds == null || courseIds.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Danh sách khóa học không được để trống"));
        }

        int success = 0;
        int failed = 0;
        List<String> errors = new ArrayList<>();
        String comment = request.getComment() != null ? request.getComment() : "Đã duyệt";

        for (UUID courseId : courseIds) {
            try {
                // ORG_ADMIN: verify course teacher is in their org
                verifyCourseOrgAccess(courseId, admin);
                approveCourseUseCase.execute(courseId, admin.getId(), comment);
                success++;
            } catch (Exception e) {
                failed++;
                errors.add(courseId + ": " + e.getMessage());
            }
        }

        BulkActionResponse result = BulkActionResponse.builder()
                .total(courseIds.size())
                .success(success)
                .failed(failed)
                .errors(errors)
                .build();

        return ResponseEntity.ok(ApiResponse.success(result, "Duyệt hàng loạt hoàn tất"));
    }

    @Operation(summary = "Bulk reject courses")
    @PatchMapping("/bulk-reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<ApiResponse<BulkActionResponse>> bulkRejectCourses(
            @RequestBody @Valid BulkRejectRequest request,
            @AuthenticationPrincipal UserJpaEntity admin
    ) {
        List<UUID> courseIds = request.getCourseIds();
        if (courseIds == null || courseIds.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Danh sách khóa học không được để trống"));
        }

        int success = 0;
        int failed = 0;
        List<String> errors = new ArrayList<>();

        com.example.lms.course_authoring.domain.model.CourseRejectionCategory bulkCategory =
                com.example.lms.course_authoring.domain.model.CourseRejectionCategory
                        .fromStringOrOther(request.getCategory());
        for (UUID courseId : courseIds) {
            try {
                // ORG_ADMIN: verify course teacher is in their org
                verifyCourseOrgAccess(courseId, admin);
                rejectCourseUseCase.execute(courseId, admin.getId(), request.getReason(), bulkCategory);
                success++;
            } catch (Exception e) {
                failed++;
                errors.add(courseId + ": " + e.getMessage());
            }
        }

        BulkActionResponse result = BulkActionResponse.builder()
                .total(courseIds.size())
                .success(success)
                .failed(failed)
                .errors(errors)
                .build();

        return ResponseEntity.ok(ApiResponse.success(result, "Từ chối hàng loạt hoàn tất"));
    }

    @Operation(summary = "Delete a course")
    @DeleteMapping("/{courseId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> deleteCourse(@PathVariable UUID courseId) {
        if (!courseRepository.existsById(courseId)) {
            throw new EntityNotFoundException("Khóa học", courseId);
        }
        courseRepository.deleteById(courseId);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa", "Khóa học đã được xóa thành công"));
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
                        .collect(Collectors.toMap(CourseCategoryJpaEntity::getId, CourseCategoryJpaEntity::getName));

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

        Map<UUID, String> submittedAtMap = resolveSubmittedAtMap(courseIds);
        return courses.map(course -> toAdminResponseBatch(course, teacherMap, categoryMap, enrollmentMap, submittedAtMap));
    }

    private CourseAdminResponse toAdminResponseBatch(Course course,
            Map<UUID, UserJpaEntity> teacherMap,
            Map<UUID, String> categoryMap,
            Map<UUID, Long> enrollmentMap,
            Map<UUID, String> submittedAtMap) {
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
        return buildCourseAdminResponse(
                course,
                teacherName,
                teacherEmail,
                categoryName,
                enrolledCount,
                submittedAtMap.get(course.getId())
        );
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
            Optional<CourseCategoryJpaEntity> category = categoryRepository.findById(course.getCategoryId());
            if (category.isPresent()) {
                categoryName = category.get().getName();
            }
        }

        int enrolledCount = 0;
        List<Object[]> counts = enrollmentRepository.countEnrollmentsByCourseIds(List.of(course.getId()));
        if (!counts.isEmpty()) {
            enrolledCount = ((Long) counts.get(0)[1]).intValue();
        }

        return buildCourseAdminResponse(
                course,
                teacherName,
                teacherEmail,
                categoryName,
                enrolledCount,
                resolveSubmittedAt(course.getId())
        );
    }

    // === Org-Scoping Helpers ===

    private boolean isOrgAdmin(UserJpaEntity user) {
        return user.getRole() == UserJpaEntity.UserRole.ORG_ADMIN;
    }

    private Set<UUID> getOrgTeacherIds(UUID organizationId) {
        if (organizationId == null) return Set.of();
        return userRepository.findByOrganizationId(organizationId).stream()
                .filter(u -> u.getRole() == UserJpaEntity.UserRole.TEACHER)
                .map(UserJpaEntity::getId)
                .collect(Collectors.toSet());
    }

    private Page<Course> queryCourses(String status, String search, PageRequest pageable) {
        if (status != null && !status.isBlank() && search != null && !search.isBlank()) {
            try {
                Course.CourseStatus courseStatus = Course.CourseStatus.valueOf(status.toUpperCase(Locale.ROOT));
                return courseRepository.findByStatusAndTitleContaining(courseStatus, search, pageable);
            } catch (IllegalArgumentException e) {
                return courseRepository.findAll(pageable);
            }
        }
        if (status != null && !status.isBlank()) {
            try {
                Course.CourseStatus courseStatus = Course.CourseStatus.valueOf(status.toUpperCase(Locale.ROOT));
                return courseRepository.findByStatus(courseStatus, pageable);
            } catch (IllegalArgumentException e) {
                return courseRepository.findAll(pageable);
            }
        }
        if (search != null && !search.isBlank()) {
            return courseRepository.findByTitleContaining(search, pageable);
        }
        return courseRepository.findAll(pageable);
    }

    private Page<Course> queryOrgScopedCourses(Set<UUID> teacherIds, String status, String search, PageRequest pageable) {
        if (teacherIds == null || teacherIds.isEmpty()) {
            return Page.empty(pageable);
        }
        if (status != null && !status.isBlank() && search != null && !search.isBlank()) {
            try {
                Course.CourseStatus courseStatus = Course.CourseStatus.valueOf(status.toUpperCase(Locale.ROOT));
                return courseRepository.findByTeacherIdsAndStatusAndTitleContaining(teacherIds, courseStatus, search, pageable);
            } catch (IllegalArgumentException e) {
                return courseRepository.findByTeacherIds(teacherIds, pageable);
            }
        }
        if (status != null && !status.isBlank()) {
            try {
                Course.CourseStatus courseStatus = Course.CourseStatus.valueOf(status.toUpperCase(Locale.ROOT));
                return courseRepository.findByTeacherIdsAndStatus(teacherIds, courseStatus, pageable);
            } catch (IllegalArgumentException e) {
                return courseRepository.findByTeacherIds(teacherIds, pageable);
            }
        }
        if (search != null && !search.isBlank()) {
            return courseRepository.findByTeacherIdsAndTitleContaining(teacherIds, search, pageable);
        }
        return courseRepository.findByTeacherIds(teacherIds, pageable);
    }

    private Page<Course> loadAndFilterOrgScopedCourses(
            Set<UUID> teacherIds,
            String status,
            String search,
            UUID categoryId,
            Instant fromInstant,
            Instant toInstant,
            PageRequest pageable
    ) {
        List<Course> matchingCourses = new ArrayList<>();
        int currentPage = 0;

        while (true) {
            PageRequest batchPageable = PageRequest.of(currentPage, 200, pageable.getSort());
            Page<Course> batch = queryOrgScopedCourses(teacherIds, status, search, batchPageable);
            matchingCourses.addAll(batch.getContent());
            if (!batch.hasNext()) {
                break;
            }
            currentPage++;
        }

        List<Course> filtered = applyAdvancedFilters(matchingCourses, categoryId, fromInstant, toInstant);
        return paginateCourses(filtered, pageable);
    }

    private List<Course> applyAdvancedFilters(List<Course> courses, UUID categoryId, Instant fromInstant, Instant toInstant) {
        boolean hasCategoryFilter = categoryId != null;
        boolean hasDateFilter = fromInstant != null || toInstant != null;
        if (!hasCategoryFilter && !hasDateFilter) {
            return courses;
        }

        return courses.stream()
                .filter(c -> !hasCategoryFilter || categoryId.equals(c.getCategoryId()))
                .filter(c -> fromInstant == null || (c.getCreatedAt() != null && !c.getCreatedAt().isBefore(fromInstant)))
                .filter(c -> toInstant == null || (c.getCreatedAt() != null && !c.getCreatedAt().isAfter(toInstant)))
                .collect(Collectors.toList());
    }

    private Page<Course> paginateCourses(List<Course> courses, PageRequest pageable) {
        int start = (int) pageable.getOffset();
        if (start >= courses.size()) {
            return new PageImpl<>(List.of(), pageable, courses.size());
        }
        int end = Math.min(start + pageable.getPageSize(), courses.size());
        return new PageImpl<>(courses.subList(start, end), pageable, courses.size());
    }

    private Map<UUID, String> resolveSubmittedAtMap(List<UUID> courseIds) {
        if (courseIds == null || courseIds.isEmpty()) {
            return Map.of();
        }

        Map<UUID, String> submittedAtMap = new HashMap<>();
        for (CourseReviewEventJpaEntity event : reviewEventRepository.findByCourseIdInOrderByCreatedAtDesc(courseIds)) {
            if (!isSubmissionAction(event.getAction()) || submittedAtMap.containsKey(event.getCourseId())) {
                continue;
            }
            submittedAtMap.put(event.getCourseId(), event.getCreatedAt() != null ? event.getCreatedAt().toString() : null);
        }
        return submittedAtMap;
    }

    private String resolveSubmittedAt(UUID courseId) {
        return reviewEventRepository.findByCourseIdOrderByCreatedAtDesc(courseId).stream()
                .filter(event -> isSubmissionAction(event.getAction()))
                .map(event -> event.getCreatedAt() != null ? event.getCreatedAt().toString() : null)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
    }

    private boolean isSubmissionAction(String action) {
        return "SUBMITTED".equalsIgnoreCase(action) || "RESUBMITTED".equalsIgnoreCase(action);
    }

    private CourseAdminResponse buildCourseAdminResponse(
            Course course,
            String teacherName,
            String teacherEmail,
            String categoryName,
            int enrolledCount,
            String submittedAt
    ) {
        String reviewState = resolveReviewState(course);
        return CourseAdminResponse.builder()
                .id(course.getId().toString())
                .code(course.getCode() != null ? course.getCode().getValue() : null)
                .title(course.getTitle())
                .description(course.getDescription())
                .category(categoryName)
                .price(course.getPrice() != null ? course.getPrice().doubleValue() : null)
                .thumbnail(course.getThumbnailUrl())
                .status(course.getStatus().name().toLowerCase(Locale.ROOT))
                .reviewState(reviewState)
                .draftChangeStatus(resolveDraftChangeStatus(course))
                .pendingReleaseNotes(course.getPendingReleaseNotes())
                .teacherId(course.getTeacherId() != null ? course.getTeacherId().toString() : null)
                .teacherName(teacherName)
                .teacherEmail(teacherEmail)
                .enrolledCount(enrolledCount)
                .sectionsCount(course.getChapterCount())
                .lessonsCount(course.getTotalLessonCount())
                .submittedAt(submittedAt)
                .rejectionReason(isRejectedReviewState(reviewState) ? course.getReviewComment() : null)
                .reviewComment(course.getReviewComment())
                .createdAt(course.getCreatedAt() != null ? course.getCreatedAt().toString() : null)
                .updatedAt(course.getUpdatedAt() != null ? course.getUpdatedAt().toString() : null)
                .approvedAt(course.getReviewedAt() != null ? course.getReviewedAt().toString() : null)
                .build();
    }

    private String resolveReviewState(Course course) {
        if (course.getStatus() != Course.CourseStatus.APPROVED) {
            return course.getStatus().name().toLowerCase(Locale.ROOT);
        }
        return switch (course.getDraftChangeStatus()) {
            case PENDING_REVIEW -> "pending_changes";
            case CHANGES_REQUESTED -> "changes_requested";
            case DRAFT -> "draft_changes";
            case NONE -> "approved";
        };
    }

    private String resolveDraftChangeStatus(Course course) {
        if (course.getDraftChangeStatus() == null || course.getDraftChangeStatus() == Course.DraftChangeStatus.NONE) {
            return null;
        }
        return course.getDraftChangeStatus().name().toLowerCase(Locale.ROOT);
    }

    private boolean isRejectedReviewState(String reviewState) {
        return "rejected".equals(reviewState) || "changes_requested".equals(reviewState);
    }

    /**
     * Parse ISO date string (e.g., "2026-01-01") to Instant.
     * For start-of-day (isStart=true), returns start of the day.
     * For end-of-day (isStart=false), returns end of the day.
     */
    private Instant parseDate(String dateStr, boolean isStart) {
        if (dateStr == null || dateStr.isBlank()) return null;
        try {
            java.time.LocalDate date = java.time.LocalDate.parse(dateStr);
            if (isStart) {
                return date.atStartOfDay(ZoneId.systemDefault()).toInstant();
            } else {
                return date.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
            }
        } catch (Exception e) {
            return null;
        }
    }

    private void verifyCourseOrgAccess(UUID courseId, UserJpaEntity admin) {
        if (!isOrgAdmin(admin)) return; // ADMIN has full access
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", courseId));
        if (course.getTeacherId() == null) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Không có quyền truy cập khóa học này");
        }
        UserJpaEntity teacher = userRepository.findById(course.getTeacherId()).orElse(null);
        if (teacher == null || !Objects.equals(teacher.getOrganizationId(), admin.getOrganizationId())) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Không có quyền truy cập khóa học của tổ chức khác");
        }
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
        private String reviewState;
        private String draftChangeStatus;
        private String pendingReleaseNotes;
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
        @Size(max = 2000, message = "Lý do không được vượt quá 2000 ký tự")
        private String reason;

        /**
         * Optional structured category (Phase 3).
         * Accepts any {@link com.example.lms.course_authoring.domain.model.CourseRejectionCategory}
         * value; invalid / absent values default to OTHER.
         */
        @Size(max = 50, message = "Danh mục từ chối không hợp lệ")
        private String category;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class BulkApproveRequest {
        @jakarta.validation.constraints.NotEmpty(message = "Danh sách khóa học không được để trống")
        private List<UUID> courseIds;

        @Size(max = 1000, message = "Nhận xét không được vượt quá 1000 ký tự")
        private String comment;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class BulkRejectRequest {
        @jakarta.validation.constraints.NotEmpty(message = "Danh sách khóa học không được để trống")
        private List<UUID> courseIds;

        @NotBlank(message = "Lý do không được để trống")
        @Size(max = 2000, message = "Lý do không được vượt quá 2000 ký tự")
        private String reason;

        /** Optional structured category shared across all bulk-rejected courses. */
        @Size(max = 50, message = "Danh mục từ chối không hợp lệ")
        private String category;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class BulkActionResponse {
        private int total;
        private int success;
        private int failed;
        private List<String> errors;
    }

    @Getter
    @AllArgsConstructor
    public static class ReviewEventResponse {
        private UUID id;
        private String action;
        private String comment;
        private UUID reviewerId;
        private String reviewerName;
        private Instant createdAt;
    }
}

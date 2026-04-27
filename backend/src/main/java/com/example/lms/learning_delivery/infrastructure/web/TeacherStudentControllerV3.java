package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentSubmissionJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentSubmissionJpaRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.learning_delivery.application.port.StudentAnalyticsQueryPort;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.EnrollmentJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.repository.LearningStreakJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.communication.application.usecase.SendMessageUseCaseV3;
import com.example.lms.shared.infrastructure.pdf.PdfReportService;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Teacher Students Controller V3
 *
 * Provides endpoints for teachers to view and manage students enrolled in their courses.
 */
@Slf4j
@RestController
@RequestMapping("/api/v3/teacher/students")
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
@Tag(name = "Teacher - Students", description = "Teacher student management endpoints")
@RequiredArgsConstructor
public class TeacherStudentControllerV3 {

    private final JpaEnrollmentRepository enrollmentRepository;
    private final UserJpaRepository userJpaRepository;
    private final JpaCourseRepository courseRepository;
    private final AssignmentSubmissionJpaRepository submissionRepository;
    private final AssignmentJpaRepository assignmentRepository;
    private final StudentAnalyticsQueryPort analyticsQuery;
    private final LearningStreakJpaRepository streakRepository;
    private final SendMessageUseCaseV3 sendMessageUseCase;
    private final PdfReportService pdfReportService;

    @Operation(summary = "Get all students enrolled in teacher's courses")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<StudentSummaryResponse>>> getTeacherStudents(
            @AuthenticationPrincipal UserJpaEntity teacher,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) UUID courseId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search
    ) {
        UUID teacherId = teacher.getId();
        int safeSize = Math.min(Math.max(size, 1), 100);
        PageRequest pageable = PageRequest.of(page, safeSize);

        // Find teacher's courses
        List<CourseJpaEntity> teacherCourses = courseRepository.findByTeacherId(teacherId);
        if (teacherCourses.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(
                    new PageImpl<>(Collections.emptyList(), pageable, 0), "Danh sách học viên"));
        }

        List<UUID> teacherCourseIds = teacherCourses.stream()
                .map(CourseJpaEntity::getId)
                .toList();
        List<UUID> courseIds = courseId != null
                ? (teacherCourseIds.contains(courseId) ? List.of(courseId) : Collections.emptyList())
                : teacherCourseIds;
        if (courseIds.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(
                    new PageImpl<>(Collections.emptyList(), pageable, 0), "Danh sĂ¡ch học viĂªn"));
        }

        // Get enrollments via learningClass.courseId (1 batch query)
        List<EnrollmentJpaEntity> enrollments = enrollmentRepository.findByLearningClass_CourseIdIn(courseIds);

        // Group by studentId so a learner enrolled in multiple classes/courses is summarized consistently.
        Map<UUID, List<EnrollmentJpaEntity>> studentEnrollments = enrollments.stream()
                .collect(Collectors.groupingBy(
                        EnrollmentJpaEntity::getStudentId,
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        // Batch-load all users (1 query instead of N)
        Map<UUID, UserJpaEntity> userMap = userJpaRepository.findAllById(studentEnrollments.keySet()).stream()
                .collect(Collectors.toMap(UserJpaEntity::getId, u -> u));

        // Build student summary list
        Set<EnrollmentJpaEntity.EnrollmentStatus> requestedStatuses = resolveRequestedStatuses(status);
        List<StudentSummaryResponse> students = new ArrayList<>();
        for (var entry : studentEnrollments.entrySet()) {
            UUID studentId = entry.getKey();
            List<EnrollmentJpaEntity> scopedEnrollments = entry.getValue();

            UserJpaEntity user = userMap.get(studentId);
            if (user == null) continue;

            // Apply search filter
            if (search != null && !search.isBlank()) {
                String s = search.toLowerCase();
                if (!user.getFullName().toLowerCase().contains(s)
                        && !user.getEmail().toLowerCase().contains(s)) {
                    continue;
                }
            }

            // Apply status filter
            if (status != null && !status.isBlank() && !requestedStatuses.isEmpty()) {
                boolean matchesStatus = scopedEnrollments.stream()
                        .map(EnrollmentJpaEntity::getStatus)
                        .anyMatch(requestedStatuses::contains);
                if (!matchesStatus) {
                    continue;
                }
            }

            Instant enrolledAt = earliestEnrollmentAt(scopedEnrollments);
            Instant lastAccessedAt = latestLastAccessedAt(scopedEnrollments);
            long completedCourses = scopedEnrollments.stream()
                    .filter(e -> e.getStatus() == EnrollmentJpaEntity.EnrollmentStatus.COMPLETED)
                    .count();

            students.add(StudentSummaryResponse.builder()
                    .id(studentId.toString())
                    .name(user.getFullName())
                    .email(user.getEmail())
                    .enrolledAt(formatInstant(enrolledAt))
                    .lastAccessed(formatInstant(lastAccessedAt))
                    .progress(averageCompletionPercent(scopedEnrollments))
                    .averageGrade(0)
                    .status(summarizeStudentStatus(scopedEnrollments))
                    .completedCourses((int) completedCourses)
                    .totalCourses(scopedEnrollments.size())
                    .build());
        }
        students.sort(Comparator.comparing(StudentSummaryResponse::getName, String.CASE_INSENSITIVE_ORDER));

        // Paginate in-memory
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), students.size());
        List<StudentSummaryResponse> pageContent = start < students.size()
                ? students.subList(start, end) : Collections.emptyList();

        Page<StudentSummaryResponse> result = new PageImpl<>(pageContent, pageable, students.size());
        return ResponseEntity.ok(ApiResponse.success(result, "Danh sách học viên"));
    }

    @Operation(summary = "Get detailed student information")
    @GetMapping("/{studentId}")
    public ResponseEntity<ApiResponse<StudentDetailResponse>> getStudentDetail(
            @AuthenticationPrincipal UserJpaEntity teacher,
            @PathVariable UUID studentId
    ) {
        verifyStudentInTeacherCourses(studentId, teacher);

        Optional<UserJpaEntity> userOpt = userJpaRepository.findById(studentId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.error("Không tìm thấy học viên"));
        }
        UserJpaEntity user = userOpt.get();

        List<EnrollmentJpaEntity> enrollments = getScopedEnrollments(studentId, teacher);
        Map<UUID, CourseJpaEntity> courseMap = getCourseMapForEnrollments(enrollments);
        long completed = enrollments.stream()
                .filter(e -> e.getStatus() == EnrollmentJpaEntity.EnrollmentStatus.COMPLETED)
                .count();
        double avgProgress = enrollments.stream()
                .filter(e -> e.getCompletionPercent() != null)
                .mapToInt(EnrollmentJpaEntity::getCompletionPercent)
                .average().orElse(0);
        List<CourseProgressResponse> courseProgress = enrollments.stream()
                .map(enrollment -> {
                    CourseJpaEntity course = courseMap.get(enrollment.getLearningClass().getCourseId());
                    int totalLessons = enrollment.getProgress() != null ? enrollment.getProgress().size() : 0;
                    int completedLessons = enrollment.getProgress() != null
                            ? (int) enrollment.getProgress().values().stream()
                            .filter(progress -> progress != null
                                    && "COMPLETED".equalsIgnoreCase(progress.getStatus()))
                            .count()
                            : 0;

                    return new CourseProgressResponse(
                            enrollment.getLearningClass().getCourseId().toString(),
                            course != null ? course.getTitle() : "Course",
                            formatInstant(enrollment.getEnrolledAt()),
                            enrollment.getCompletionPercent() != null ? enrollment.getCompletionPercent() : 0,
                            completedLessons,
                            totalLessons,
                            formatInstant(enrollment.getLastAccessedAt()),
                            null,
                            toCourseProgressStatus(enrollment.getStatus())
                    );
                })
                .sorted(Comparator.comparing(CourseProgressResponse::courseTitle, String.CASE_INSENSITIVE_ORDER))
                .toList();
        Instant enrolledAt = earliestEnrollmentAt(enrollments);
        Instant lastAccessedAt = latestLastAccessedAt(enrollments);

        StudentDetailResponse detail = StudentDetailResponse.builder()
                .id(studentId.toString())
                .name(user.getFullName())
                .email(user.getEmail())
                .enrolledAt(formatInstant(enrolledAt))
                .lastAccessed(formatInstant(lastAccessedAt))
                .progress(enrollments.isEmpty() ? 0 : (int) Math.round(avgProgress))
                .averageGrade(0)
                .status(summarizeStudentStatus(enrollments))
                .completedCourses((int) completed)
                .totalCourses(enrollments.size())
                .courseProgress(courseProgress)
                .assignmentSubmissions(Collections.emptyList())
                .build();

        return ResponseEntity.ok(ApiResponse.success(detail, "Thông tin học viên"));
    }

    @Operation(summary = "Get student's assignment submissions")
    @GetMapping("/{studentId}/assignments")
    public ResponseEntity<ApiResponse<List<StudentAssignmentResponse>>> getStudentAssignments(
            @AuthenticationPrincipal UserJpaEntity teacher,
            @PathVariable UUID studentId,
            @RequestParam(required = false) String courseId,
            @RequestParam(required = false) String status
    ) {
        verifyStudentInTeacherCourses(studentId, teacher);
        List<AssignmentSubmissionJpaEntity> submissions = submissionRepository.findByStudentId(studentId);
        Set<UUID> visibleCourseIds = teacher.getRole() == UserJpaEntity.UserRole.ADMIN
                ? submissions.stream()
                .map(AssignmentSubmissionJpaEntity::getCourseId)
                .collect(Collectors.toSet())
                : getTeacherCourseIds(teacher.getId());

        // Build assignment ID → assignment map for titles
        List<UUID> assignmentIds = submissions.stream()
                .map(AssignmentSubmissionJpaEntity::getAssignmentId).distinct().toList();
        Map<UUID, AssignmentJpaEntity> assignmentMap = assignmentRepository.findAllById(assignmentIds)
                .stream().collect(Collectors.toMap(AssignmentJpaEntity::getId, Function.identity()));

        List<StudentAssignmentResponse> result = submissions.stream()
                .filter(s -> visibleCourseIds.contains(s.getCourseId()))
                .filter(s -> courseId == null || courseId.isBlank() || courseId.equals(String.valueOf(s.getCourseId())))
                .filter(s -> status == null || status.isBlank() || s.getStatus().name().equalsIgnoreCase(status))
                .map(s -> {
                    AssignmentJpaEntity assignment = assignmentMap.get(s.getAssignmentId());
                    return new StudentAssignmentResponse(
                            s.getId().toString(),
                            s.getAssignmentId().toString(),
                            assignment != null ? assignment.getTitle() : "Assignment",
                            s.getStatus().name(),
                            s.getGrade(),
                            s.getMaxGrade(),
                            s.getSubmittedAt() != null ? s.getSubmittedAt().toString() : null,
                            s.getGradedAt() != null ? s.getGradedAt().toString() : null,
                            s.getFeedback()
                    );
                })
                .toList();

        return ResponseEntity.ok(ApiResponse.success(result, "Danh sách bài tập"));
    }

    @Operation(summary = "Get student analytics")
    @GetMapping("/{studentId}/analytics")
    public ResponseEntity<ApiResponse<StudentAnalyticsResponse>> getStudentAnalytics(
            @AuthenticationPrincipal UserJpaEntity teacher,
            @PathVariable UUID studentId,
            @RequestParam(required = false) String courseId,
            @RequestParam(required = false) String timeRange
    ) {
        verifyStudentInTeacherCourses(studentId, teacher);
        // Real data from analytics query port
        long gradedQuizzes = analyticsQuery.countGradedQuizAttempts(studentId);
        long gradedAssignments = analyticsQuery.countGradedAssignments(studentId);
        int studyTimeMinutes = (int) (gradedQuizzes * 15 + gradedAssignments * 30);

        Double quizAvg = analyticsQuery.getAverageQuizScorePercent(studentId);
        Double assignmentAvg = analyticsQuery.getAverageAssignmentGradePercent(studentId);
        double avgScore = 0;
        if (quizAvg != null && assignmentAvg != null) avgScore = (quizAvg + assignmentAvg) / 2;
        else if (quizAvg != null) avgScore = quizAvg;
        else if (assignmentAvg != null) avgScore = assignmentAvg;

        int streakDays = analyticsQuery.getStreakDays(studentId);

        long submittedAssignments = submissionRepository.countByStudentIdAndStatus(
                studentId, AssignmentSubmissionJpaEntity.SubmissionStatus.GRADED);

        StudentAnalyticsResponse analytics = StudentAnalyticsResponse.builder()
                .totalStudyTime(studyTimeMinutes)
                .averageSessionTime(studyTimeMinutes > 0 ? studyTimeMinutes / Math.max(1, (int)(gradedQuizzes + gradedAssignments)) : 0)
                .streakDays(streakDays)
                .assignmentsCompleted((int) submittedAssignments)
                .assignmentsOverdue(0)
                .averageScore(Math.round(avgScore * 10.0) / 10.0)
                .strongSubjects(Collections.emptyList())
                .improvementAreas(Collections.emptyList())
                .learningActivity(Collections.emptyList())
                .build();
        return ResponseEntity.ok(ApiResponse.success(analytics, "Dữ liệu phân tích"));
    }

    @Operation(summary = "Update student enrollment status in teacher's courses")
    @PatchMapping("/{studentId}/status")
    public ResponseEntity<ApiResponse<StudentSummaryResponse>> updateStudentStatus(
            @AuthenticationPrincipal UserJpaEntity teacher,
            @PathVariable UUID studentId,
            @Valid @RequestBody StatusUpdateRequest request
    ) {
        Optional<UserJpaEntity> userOpt = userJpaRepository.findById(studentId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.error("Không tìm thấy học viên"));
        }
        UserJpaEntity user = userOpt.get();

        // Update enrollment status in teacher's courses only
        List<EnrollmentJpaEntity> enrollments = getScopedEnrollments(studentId, teacher);

        for (EnrollmentJpaEntity enrollment : enrollments) {
            try {
                enrollment.setStatus(EnrollmentJpaEntity.EnrollmentStatus.valueOf(request.getStatus().toUpperCase()));
                enrollmentRepository.save(enrollment);
            } catch (IllegalArgumentException ignored) {
                // Invalid status value — skip
            }
        }

        StudentSummaryResponse response = StudentSummaryResponse.builder()
                .id(studentId.toString())
                .name(user.getFullName())
                .email(user.getEmail())
                .status(request.getStatus())
                .build();
        return ResponseEntity.ok(ApiResponse.success(response, "Cập nhật trạng thái thành công"));
    }

    @Operation(summary = "Send message to student")
    @PostMapping("/{studentId}/messages")
    public ResponseEntity<ApiResponse<Map<String, Object>>> sendMessage(
            @AuthenticationPrincipal UserJpaEntity teacher,
            @PathVariable UUID studentId,
            @Valid @RequestBody MessageRequest request
    ) {
        var sendResult = sendMessageUseCase.execute(
                new SendMessageUseCaseV3.SendMessageCommand(teacher.getId(), studentId, request.getContent(),
                        teacher.getFullName(), teacher.getRole().name())
        );
        log.info("[Message] Giáo viên {} gửi tin nhắn đến học viên {}", teacher.getId(), studentId);
        Map<String, Object> result = Map.of("messageId", sendResult.messageId().toString());
        return ResponseEntity.ok(ApiResponse.success(result, "Gửi tin nhắn thành công"));
    }

    @Operation(summary = "Export student progress report as PDF")
    @GetMapping("/{studentId}/export")
    public ResponseEntity<byte[]> exportStudentReport(
            @AuthenticationPrincipal UserJpaEntity teacher,
            @PathVariable UUID studentId,
            @RequestParam(defaultValue = "pdf") String format
    ) {
        var student = userJpaRepository.findById(studentId)
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("User", studentId));

        // Gather course progress data
        var enrollments = getScopedEnrollments(studentId, teacher);
        Map<UUID, CourseJpaEntity> courseMap = getCourseMapForEnrollments(enrollments);

        List<Map<String, Object>> courseData = enrollments.stream().map(e -> {
            Map<String, Object> m = new HashMap<>();
            var course = courseMap.get(e.getLearningClass().getCourseId());
            m.put("courseName", course != null ? course.getTitle() : "N/A");
            m.put("progress", e.getProgress() != null ? e.getProgress().size() : 0);
            m.put("grade", 0.0);
            m.put("status", e.getStatus() != null ? e.getStatus().name() : "UNKNOWN");
            return m;
        }).toList();

        Map<String, Object> stats = Map.of(
                "totalCourses", enrollments.size(),
                "completedCourses", enrollments.stream().filter(e -> e.getStatus() != null
                        && e.getStatus().name().equals("COMPLETED")).count(),
                "averageGrade", 0.0,
                "streakDays", 0
        );

        try {
            byte[] pdf = pdfReportService.generateStudentReport(
                    student.getFullName(), student.getEmail(), courseData, stats);
            log.info("[Report] Xuất báo cáo PDF cho học viên {}", studentId);
            return ResponseEntity.ok()
                    .header("Content-Type", "application/pdf")
                    .header("Content-Disposition", "attachment; filename=\"student-report-" + studentId + ".pdf\"")
                    .body(pdf);
        } catch (java.io.IOException e) {
            log.error("[Report] Lỗi tạo PDF cho học viên {}: {}", studentId, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    // === Helpers ===

    private Set<UUID> getTeacherCourseIds(UUID teacherId) {
        return courseRepository.findByTeacherId(teacherId).stream()
                .map(CourseJpaEntity::getId)
                .collect(Collectors.toSet());
    }

    private void verifyStudentInTeacherCourses(UUID studentId, UserJpaEntity teacher) {
        // Admin bypass
        if (teacher.getRole() == UserJpaEntity.UserRole.ADMIN) {
            return;
        }
        List<UUID> teacherCourseIds = new ArrayList<>(getTeacherCourseIds(teacher.getId()));
        boolean enrolled = !teacherCourseIds.isEmpty()
                && enrollmentRepository.existsByStudentIdAndCourseIds(studentId, teacherCourseIds);
        if (!enrolled) {
            throw new com.example.lms.shared.exception.BusinessRuleException(
                    "Học viên này không thuộc khóa học của bạn");
        }
    }

    private List<EnrollmentJpaEntity> getScopedEnrollments(UUID studentId, UserJpaEntity teacher) {
        if (teacher.getRole() == UserJpaEntity.UserRole.ADMIN) {
            return enrollmentRepository.findByStudentIdWithClass(studentId);
        }

        List<UUID> teacherCourseIds = new ArrayList<>(getTeacherCourseIds(teacher.getId()));
        if (teacherCourseIds.isEmpty()) {
            return Collections.emptyList();
        }

        return enrollmentRepository.findByStudentIdAndCourseIds(studentId, teacherCourseIds);
    }

    private Map<UUID, CourseJpaEntity> getCourseMapForEnrollments(List<EnrollmentJpaEntity> enrollments) {
        if (enrollments.isEmpty()) {
            return Collections.emptyMap();
        }

        List<UUID> courseIds = enrollments.stream()
                .map(e -> e.getLearningClass().getCourseId())
                .distinct()
                .toList();

        return courseRepository.findAllById(courseIds).stream()
                .collect(Collectors.toMap(CourseJpaEntity::getId, Function.identity()));
    }

    private Set<EnrollmentJpaEntity.EnrollmentStatus> resolveRequestedStatuses(String status) {
        if (status == null || status.isBlank()) {
            return EnumSet.noneOf(EnrollmentJpaEntity.EnrollmentStatus.class);
        }

        return switch (status.trim().toUpperCase(Locale.ROOT)) {
            case "ACTIVE" -> EnumSet.of(EnrollmentJpaEntity.EnrollmentStatus.ACTIVE);
            case "COMPLETED" -> EnumSet.of(EnrollmentJpaEntity.EnrollmentStatus.COMPLETED);
            case "SUSPENDED" -> EnumSet.of(EnrollmentJpaEntity.EnrollmentStatus.SUSPENDED);
            case "DROPPED" -> EnumSet.of(EnrollmentJpaEntity.EnrollmentStatus.DROPPED);
            case "EXPIRED" -> EnumSet.of(EnrollmentJpaEntity.EnrollmentStatus.EXPIRED);
            case "INACTIVE" -> EnumSet.of(
                    EnrollmentJpaEntity.EnrollmentStatus.COMPLETED,
                    EnrollmentJpaEntity.EnrollmentStatus.DROPPED,
                    EnrollmentJpaEntity.EnrollmentStatus.EXPIRED
            );
            default -> EnumSet.noneOf(EnrollmentJpaEntity.EnrollmentStatus.class);
        };
    }

    private String summarizeStudentStatus(List<EnrollmentJpaEntity> enrollments) {
        if (enrollments.stream().anyMatch(e -> e.getStatus() == EnrollmentJpaEntity.EnrollmentStatus.ACTIVE)) {
            return EnrollmentJpaEntity.EnrollmentStatus.ACTIVE.name();
        }
        if (enrollments.stream().anyMatch(e -> e.getStatus() == EnrollmentJpaEntity.EnrollmentStatus.SUSPENDED)) {
            return EnrollmentJpaEntity.EnrollmentStatus.SUSPENDED.name();
        }
        if (enrollments.stream().anyMatch(e -> e.getStatus() == EnrollmentJpaEntity.EnrollmentStatus.COMPLETED)) {
            return EnrollmentJpaEntity.EnrollmentStatus.COMPLETED.name();
        }
        if (enrollments.stream().anyMatch(e -> e.getStatus() == EnrollmentJpaEntity.EnrollmentStatus.EXPIRED)) {
            return EnrollmentJpaEntity.EnrollmentStatus.EXPIRED.name();
        }

        return enrollments.stream()
                .map(EnrollmentJpaEntity::getStatus)
                .findFirst()
                .orElse(EnrollmentJpaEntity.EnrollmentStatus.DROPPED)
                .name();
    }

    private int averageCompletionPercent(List<EnrollmentJpaEntity> enrollments) {
        return (int) Math.round(enrollments.stream()
                .map(EnrollmentJpaEntity::getCompletionPercent)
                .filter(Objects::nonNull)
                .mapToInt(Integer::intValue)
                .average()
                .orElse(0));
    }

    private Instant earliestEnrollmentAt(List<EnrollmentJpaEntity> enrollments) {
        return enrollments.stream()
                .map(EnrollmentJpaEntity::getEnrolledAt)
                .filter(Objects::nonNull)
                .min(Instant::compareTo)
                .orElse(null);
    }

    private Instant latestLastAccessedAt(List<EnrollmentJpaEntity> enrollments) {
        return enrollments.stream()
                .map(EnrollmentJpaEntity::getLastAccessedAt)
                .filter(Objects::nonNull)
                .max(Instant::compareTo)
                .orElse(null);
    }

    private String formatInstant(Instant instant) {
        return instant != null ? instant.toString() : null;
    }

    private String toCourseProgressStatus(EnrollmentJpaEntity.EnrollmentStatus status) {
        return switch (status) {
            case ACTIVE, SUSPENDED -> "in-progress";
            case COMPLETED -> "completed";
            case DROPPED, EXPIRED -> "dropped";
        };
    }

    // === DTOs ===

    public static class StudentSummaryResponse {
        private String id;
        private String name;
        private String email;
        private String enrolledAt;
        private String lastAccessed;
        private int progress;
        private double averageGrade;
        private String status;
        private int completedCourses;
        private int totalCourses;

        public StudentSummaryResponse() {}
        public StudentSummaryResponse(String id, String name, String email, String enrolledAt, String lastAccessed, int progress, double averageGrade, String status, int completedCourses, int totalCourses) {
             this.id = id; this.name = name; this.email = email; this.enrolledAt = enrolledAt; this.lastAccessed = lastAccessed; this.progress = progress; this.averageGrade = averageGrade; this.status = status; this.completedCourses = completedCourses; this.totalCourses = totalCourses;
        }
        public static Builder builder() { return new Builder(); }
        public static class Builder {
            private String id; private String name; private String email; private String enrolledAt; private String lastAccessed; private int progress; private double averageGrade; private String status; private int completedCourses; private int totalCourses;
            public Builder id(String id) { this.id = id; return this; }
            public Builder name(String name) { this.name = name; return this; }
            public Builder email(String email) { this.email = email; return this; }
            public Builder enrolledAt(String enrolledAt) { this.enrolledAt = enrolledAt; return this; }
            public Builder lastAccessed(String lastAccessed) { this.lastAccessed = lastAccessed; return this; }
            public Builder progress(int progress) { this.progress = progress; return this; }
            public Builder averageGrade(double averageGrade) { this.averageGrade = averageGrade; return this; }
            public Builder status(String status) { this.status = status; return this; }
            public Builder completedCourses(int completedCourses) { this.completedCourses = completedCourses; return this; }
            public Builder totalCourses(int totalCourses) { this.totalCourses = totalCourses; return this; }
            public StudentSummaryResponse build() { return new StudentSummaryResponse(id, name, email, enrolledAt, lastAccessed, progress, averageGrade, status, completedCourses, totalCourses); }
        }
        public String getId() { return id; }
        public String getName() { return name; }
        public String getEmail() { return email; }
        public String getEnrolledAt() { return enrolledAt; }
        public String getLastAccessed() { return lastAccessed; }
        public int getProgress() { return progress; }
        public double getAverageGrade() { return averageGrade; }
        public String getStatus() { return status; }
        public int getCompletedCourses() { return completedCourses; }
        public int getTotalCourses() { return totalCourses; }
    }

    public static class StudentDetailResponse {
        private String id; private String name; private String email; private String enrolledAt; private String lastAccessed; private int progress; double averageGrade; String status; int completedCourses; int totalCourses; List<CourseProgressResponse> courseProgress; List<StudentAssignmentResponse> assignmentSubmissions;
        public StudentDetailResponse(String id, String name, String email, String enrolledAt, String lastAccessed, int progress, double averageGrade, String status, int completedCourses, int totalCourses, List<CourseProgressResponse> courseProgress, List<StudentAssignmentResponse> assignmentSubmissions) {
            this.id = id; this.name = name; this.email = email; this.enrolledAt = enrolledAt; this.lastAccessed = lastAccessed; this.progress = progress; this.averageGrade = averageGrade; this.status = status; this.completedCourses = completedCourses; this.totalCourses = totalCourses; this.courseProgress = courseProgress; this.assignmentSubmissions = assignmentSubmissions;
        }
        public static Builder builder() { return new Builder(); }
        public static class Builder {
            private String id; private String name; private String email; private String enrolledAt; private String lastAccessed; private int progress; private double averageGrade; private String status; private int completedCourses; private int totalCourses; private List<CourseProgressResponse> courseProgress; private List<StudentAssignmentResponse> assignmentSubmissions;
            public Builder id(String id) { this.id = id; return this; }
            public Builder name(String name) { this.name = name; return this; }
            public Builder email(String email) { this.email = email; return this; }
            public Builder enrolledAt(String enrolledAt) { this.enrolledAt = enrolledAt; return this; }
            public Builder lastAccessed(String lastAccessed) { this.lastAccessed = lastAccessed; return this; }
            public Builder progress(int progress) { this.progress = progress; return this; }
            public Builder averageGrade(double averageGrade) { this.averageGrade = averageGrade; return this; }
            public Builder status(String status) { this.status = status; return this; }
            public Builder completedCourses(int completedCourses) { this.completedCourses = completedCourses; return this; }
            public Builder totalCourses(int totalCourses) { this.totalCourses = totalCourses; return this; }
            public Builder courseProgress(List<CourseProgressResponse> courseProgress) { this.courseProgress = courseProgress; return this; }
            public Builder assignmentSubmissions(List<StudentAssignmentResponse> assignmentSubmissions) { this.assignmentSubmissions = assignmentSubmissions; return this; }
            public StudentDetailResponse build() { return new StudentDetailResponse(id, name, email, enrolledAt, lastAccessed, progress, averageGrade, status, completedCourses, totalCourses, courseProgress, assignmentSubmissions); }
        }
        public String getId() { return id; }
        public String getName() { return name; }
        public String getEmail() { return email; }
        public String getEnrolledAt() { return enrolledAt; }
        public String getLastAccessed() { return lastAccessed; }
        public int getProgress() { return progress; }
        public double getAverageGrade() { return averageGrade; }
        public String getStatus() { return status; }
        public int getCompletedCourses() { return completedCourses; }
        public int getTotalCourses() { return totalCourses; }
        public List<CourseProgressResponse> getCourseProgress() { return courseProgress; }
        public List<StudentAssignmentResponse> getAssignmentSubmissions() { return assignmentSubmissions; }
    }

    public static class StudentAnalyticsResponse {
        private int totalStudyTime; private int averageSessionTime; private int streakDays; private int assignmentsCompleted; private int assignmentsOverdue; private double averageScore; private List<String> strongSubjects; private List<String> improvementAreas; private List<LearningActivityResponse> learningActivity;
        public StudentAnalyticsResponse(int totalStudyTime, int averageSessionTime, int streakDays, int assignmentsCompleted, int assignmentsOverdue, double averageScore, List<String> strongSubjects, List<String> improvementAreas, List<LearningActivityResponse> learningActivity) {
            this.totalStudyTime = totalStudyTime; this.averageSessionTime = averageSessionTime; this.streakDays = streakDays; this.assignmentsCompleted = assignmentsCompleted; this.assignmentsOverdue = assignmentsOverdue; this.averageScore = averageScore; this.strongSubjects = strongSubjects; this.improvementAreas = improvementAreas; this.learningActivity = learningActivity;
        }
        public static Builder builder() { return new Builder(); }
        public static class Builder {
            private int totalStudyTime; private int averageSessionTime; private int streakDays; private int assignmentsCompleted; private int assignmentsOverdue; private double averageScore; private List<String> strongSubjects; private List<String> improvementAreas; private List<LearningActivityResponse> learningActivity;
            public Builder totalStudyTime(int t) { this.totalStudyTime = t; return this; }
            public Builder averageSessionTime(int t) { this.averageSessionTime = t; return this; }
            public Builder streakDays(int t) { this.streakDays = t; return this; }
            public Builder assignmentsCompleted(int t) { this.assignmentsCompleted = t; return this; }
            public Builder assignmentsOverdue(int t) { this.assignmentsOverdue = t; return this; }
            public Builder averageScore(double t) { this.averageScore = t; return this; }
            public Builder strongSubjects(List<String> t) { this.strongSubjects = t; return this; }
            public Builder improvementAreas(List<String> t) { this.improvementAreas = t; return this; }
            public Builder learningActivity(List<LearningActivityResponse> t) { this.learningActivity = t; return this; }
            public StudentAnalyticsResponse build() { return new StudentAnalyticsResponse(totalStudyTime, averageSessionTime, streakDays, assignmentsCompleted, assignmentsOverdue, averageScore, strongSubjects, improvementAreas, learningActivity); }
        }
        public int getTotalStudyTime() { return totalStudyTime; }
    }

    public record CourseProgressResponse(
            String courseId,
            String courseTitle,
            String enrolledAt,
            int progress,
            int completedLessons,
            int totalLessons,
            String lastAccessed,
            Double grade,
            String status
    ) {}
    public record StudentAssignmentResponse(
            String id, String assignmentId, String title, String status,
            Double grade, Double maxGrade, String submittedAt, String gradedAt, String feedback
    ) {}
    public record LearningActivityResponse() {}

    public static class StatusUpdateRequest {
        @NotBlank(message = "Trạng thái không được để trống")
        private String status;
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }

    public static class MessageRequest {
        private String subject;
        @NotBlank(message = "Nội dung không được để trống")
        private String content;
        public String getSubject() { return subject; }
        public void setSubject(String subject) { this.subject = subject; }
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
    }
}

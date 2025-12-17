package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.entity.Assignment;
import com.example.lms.entity.Course;
import com.example.lms.entity.Chapter;
import com.example.lms.entity.Section;
import com.example.lms.entity.User;
import com.example.lms.entity.Quiz;
import com.example.lms.service.CourseService;
import com.example.lms.service.ExcelProcessingService;
import com.example.lms.dto.response.BulkEnrollmentResponse;
import org.springframework.web.multipart.MultipartFile;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/courses")
@RequiredArgsConstructor
@Tag(name = "Course Management", description = "API quản lý khóa học")
public class CourseController {

    private final CourseService courseService;
    private final com.example.lms.service.ClassService classService;
    private final com.example.lms.service.EnrollmentService enrollmentService;
    private final ExcelProcessingService excelProcessingService;
    private final com.example.lms.repository.UserRepository userRepository;

    @GetMapping
    @Operation(summary = "Lấy danh sách khóa học công khai", description = "Lấy danh sách khóa học đã được duyệt")
    public ResponseEntity<ApiResponse<Page<CourseSummary>>> getPublicCourses(
            @Parameter(description = "Số trang (bắt đầu từ 1)") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "Số lượng item trên mỗi trang") @RequestParam(defaultValue = "10") int limit,
            @Parameter(description = "Tìm kiếm theo tên khóa học") @RequestParam(required = false) String search,
            @Parameter(description = "Lọc theo giảng viên") @RequestParam(required = false) String teacher,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            Pageable pageable = PageRequest.of(page - 1, limit);
            Page<Course> courses = courseService.getApprovedCourses(pageable, search, teacher);

            Page<CourseSummary> courseSummaries = courses.map(course -> convertToCourseSummary(course, currentUser));

            return ResponseEntity.ok(ApiResponse.success(courseSummaries));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Lỗi khi lấy danh sách khóa học: " + e.getMessage()));
        }
    }

    @PostMapping("/{courseId}/enrollments")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Gán học viên vào khóa học", description = "Giảng viên hoặc admin gán một học viên cụ thể vào khóa học")
    public ResponseEntity<ApiResponse<String>> enrollStudentByTeacher(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody EnrollStudentRequest request
    ) {
        try {
            courseService.enrollStudentByTeacher(courseId, currentUser, request);
            return ResponseEntity.ok(ApiResponse.success("Đã gán học viên vào khóa học"));
        } catch (RuntimeException e) {
            String msg = e.getMessage();
            if (msg == null || msg.isBlank()) {
                msg = e.getClass().getSimpleName();
            }
            if (msg.contains("Không tìm thấy")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(msg));
            }
            if (msg.toLowerCase().contains("quyền")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error(msg));
            }
            return ResponseEntity.badRequest().body(ApiResponse.error(msg));
        }
    }

    @PostMapping("/{courseId}/bulk-enroll")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Gán nhiều học viên bằng file Excel", description = "Giảng viên hoặc admin gán nhiều học viên vào khóa học thông qua file Excel")
    public ResponseEntity<ApiResponse<BulkEnrollmentResponse>> bulkEnrollStudents(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal User currentUser,
            @RequestParam("file") MultipartFile file
    ) {
        try {
            // Extract emails from Excel file
            List<String> emails = excelProcessingService.extractEmailsFromExcel(file);
            
            if (emails.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Không tìm thấy email nào trong file Excel"));
            }
            
            // Perform bulk enrollment
            BulkEnrollmentResponse response = courseService.bulkEnrollStudents(courseId, emails);
            
            return ResponseEntity.ok(ApiResponse.success(response, 
                String.format("Đã xử lý %d email: %d thành công, %d lỗi", 
                    response.getTotalProcessed(), response.getSuccessCount(), response.getErrorCount())));
                    
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("Lỗi xử lý file: " + e.getMessage()));
        }
    }

    @PostMapping
    @PreAuthorize("hasRole('TEACHER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Tạo khóa học mới", description = "Giảng viên tạo khóa học mới với trạng thái DRAFT (cần gửi phê duyệt)")
    public ResponseEntity<ApiResponse<CourseDetail>> createCourse(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreateCourseRequest request
    ) {
        try {
            Course course = courseService.createCourse(currentUser, request);
            CourseDetail courseDetail = convertToCourseDetail(course);
            
            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(courseDetail));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/my-courses")
    @PreAuthorize("hasRole('TEACHER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lấy danh sách khóa học của giảng viên", description = "Giảng viên lấy tất cả khóa học của mình")
    public ResponseEntity<ApiResponse<Page<com.example.lms.dto.CourseSummaryDTO>>> getMyCourses(
            @AuthenticationPrincipal User currentUser,
            @Parameter(description = "Số trang (bắt đầu từ 1)") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "Số lượng item trên mỗi trang") @RequestParam(defaultValue = "10") int limit
    ) {
        try {
            Pageable pageable = PageRequest.of(page - 1, limit);
            // OPTIMIZED: Use DTO Projection - single query instead of N+1
            Page<com.example.lms.dto.CourseSummaryDTO> courseSummaries = courseService.getCoursesSummaryByTeacher(currentUser, pageable);
            
            return ResponseEntity.ok(ApiResponse.success(courseSummaries));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Lỗi khi lấy danh sách khóa học: " + e.getMessage()));
        }
    }

    @GetMapping("/enrolled-courses")
    @PreAuthorize("hasRole('STUDENT')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lấy danh sách khóa học đã đăng ký", description = "Học viên lấy tất cả khóa học đã đăng ký")
    public ResponseEntity<ApiResponse<Page<CourseSummary>>> getEnrolledCourses(
            @AuthenticationPrincipal User currentUser,
            @Parameter(description = "Số trang (bắt đầu từ 1)") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "Số lượng item trên mỗi trang") @RequestParam(defaultValue = "10") int limit
    ) {
        try {
            Pageable pageable = PageRequest.of(page - 1, limit);
            Page<Course> courses = courseService.getEnrolledCourses(currentUser, pageable);
            
            Page<CourseSummary> courseSummaries = courses.map(this::convertToCourseSummary);
            
            return ResponseEntity.ok(ApiResponse.success(courseSummaries));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Lỗi khi lấy danh sách khóa học đã đăng ký: " + e.getMessage()));
        }
    }

    @GetMapping("/{courseId}")
    @Operation(summary = "Lấy thông tin chi tiết khóa học", description = "Lấy thông tin chi tiết của khóa học. Teacher có thể xem khóa học của mình dù chưa được duyệt.")
    public ResponseEntity<ApiResponse<CourseDetail>> getCourseById(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal User currentUser) {
        try {
            Course course = courseService.getCourseById(courseId);
            
            boolean isTeacherOfCourse = currentUser != null && 
                                       course.getTeacher() != null && 
                                       course.getTeacher().getId().equals(currentUser.getId());
            
            if (!isTeacherOfCourse && course.getStatus() != Course.CourseStatus.APPROVED) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Khóa học đang được kiểm duyệt hoặc chưa được công khai"));
            }
            
            CourseDetail courseDetail = convertToCourseDetail(course);
            return ResponseEntity.ok(ApiResponse.success(courseDetail));
        } catch (RuntimeException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Không tìm thấy khóa học";
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(msg));
        }
    }

    @PutMapping("/{courseId}")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Cập nhật khóa học", description = "Giảng viên cập nhật khóa học của mình")
    public ResponseEntity<ApiResponse<CourseDetail>> updateCourse(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody UpdateCourseRequest request
    ) {
        try {
            Course course = courseService.updateCourse(courseId, currentUser, request);
            CourseDetail courseDetail = convertToCourseDetail(course);
            
            return ResponseEntity.ok(ApiResponse.success(courseDetail));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/{courseId}/submit-for-approval")
    @PreAuthorize("hasRole('TEACHER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Gửi khóa học để phê duyệt", description = "Giảng viên gửi khóa học DRAFT hoặc REJECTED để admin phê duyệt")
    public ResponseEntity<ApiResponse<CourseDetail>> submitForApproval(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            Course course = courseService.submitForApproval(courseId, currentUser);
            CourseDetail courseDetail = convertToCourseDetail(course);
            return ResponseEntity.ok(ApiResponse.success(courseDetail, "Khóa học đã được gửi để phê duyệt"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/{courseId}/cancel-approval")
    @PreAuthorize("hasRole('TEACHER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Hủy yêu cầu phê duyệt", description = "Giảng viên hủy yêu cầu phê duyệt để chỉnh sửa khóa học")
    public ResponseEntity<ApiResponse<CourseDetail>> cancelApprovalRequest(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            Course course = courseService.cancelApprovalRequest(courseId, currentUser);
            CourseDetail courseDetail = convertToCourseDetail(course);
            return ResponseEntity.ok(ApiResponse.success(courseDetail, "Đã hủy yêu cầu phê duyệt"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/{courseId}/review-status")
    @PreAuthorize("hasRole('TEACHER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lấy trạng thái phê duyệt", description = "Giảng viên xem trạng thái và feedback phê duyệt của khóa học")
    public ResponseEntity<ApiResponse<CourseReviewStatus>> getReviewStatus(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            Course course = courseService.getCourseById(courseId);
            
            // Check if user is the teacher of this course
            if (!course.getTeacher().getId().equals(currentUser.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("Bạn không có quyền xem trạng thái phê duyệt của khóa học này"));
            }
            
            CourseReviewStatus status = CourseReviewStatus.builder()
                    .courseId(course.getId())
                    .status(course.getStatus().name())
                    .reviewComment(course.getReviewComment())
                    .reviewedAt(course.getReviewedAt())
                    .reviewedByName(course.getReviewedBy() != null ? course.getReviewedBy().getFullName() : null)
                    .build();
            
            return ResponseEntity.ok(ApiResponse.success(status));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{courseId}")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Xóa khóa học", description = "Giảng viên xóa khóa học của mình")
    public ResponseEntity<ApiResponse<String>> deleteCourse(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            courseService.deleteCourse(courseId, currentUser);
            return ResponseEntity.ok(ApiResponse.success("Khóa học đã được xóa"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/{courseId}/enroll")
    @PreAuthorize("hasRole('STUDENT')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Đăng ký khóa học", description = "Học viên đăng ký vào khóa học (chọn lớp)")
    public ResponseEntity<?> enrollCourse(
            @PathVariable UUID courseId,
            @RequestBody(required = false) EnrollRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            UUID classId = (request != null) ? request.getClassId() : null;

            if (classId == null) {
                // Auto-select logic
                List<com.example.lms.learning_delivery.domain.model.LearningClass> classes = classService.getOpenClasses(courseId);
                if (classes.size() == 1) {
                    classId = classes.get(0).getId();
                } else if (classes.isEmpty()) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Không có lớp học nào đang mở đăng ký"));
                } else {
                    return ResponseEntity.badRequest().body(Map.of("message", "Vui lòng chọn một lớp học cụ thể"));
                }
            }

            enrollmentService.enrollStudent(currentUser.getId(), classId);
            return ResponseEntity.ok(Map.of("message", "Đăng ký thành công!"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    public static class EnrollRequest {
        private UUID classId;
        public EnrollRequest() {}
        public UUID getClassId() { return classId; }
        public void setClassId(UUID classId) { this.classId = classId; }
    }

    @GetMapping("/{courseId}/students")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lấy danh sách học viên của khóa học", description = "Giảng viên lấy danh sách học viên đã đăng ký khóa học")
    public ResponseEntity<ApiResponse<List<EnrolledStudentInfo>>> getEnrolledStudents(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            Course course = courseService.getCourseById(courseId);
            
            List<EnrolledStudentInfo> students = course.getEnrolledStudents().stream()
                    .map(student -> EnrolledStudentInfo.builder()
                            .id(student.getId())
                            .fullName(student.getFullName())
                            .email(student.getEmail())
                            .enrolledAt(student.getCreatedAt())
                            .build())
                    .collect(Collectors.toList());
            
            return ResponseEntity.ok(ApiResponse.success(students));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/{courseId}/content")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lấy nội dung khóa học", description = "Lấy toàn bộ chapters (sections) -> lessons -> topics (sections)")
    public ResponseEntity<ApiResponse<List<ChapterResponse>>> getCourseContent(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            // Updated service returns List<Chapter>
            List<Chapter> chapters = courseService.getCourseContent(courseId, currentUser);
            List<ChapterResponse> content = chapters.stream()
                    .map(this::convertToChapterResponse)
                    .collect(Collectors.toList());
            
            return ResponseEntity.ok(ApiResponse.success(content));
        } catch (RuntimeException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Có lỗi xảy ra";
            if (msg.toLowerCase().contains("quyền")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error(msg));
            }
            if (msg.contains("Không tìm thấy")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(msg));
            }
            return ResponseEntity.badRequest().body(ApiResponse.error(msg));
        }
    }

    @GetMapping("/{courseId}/available-students")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lấy danh sách học viên chưa đăng ký khóa học", description = "Giáo viên/Admin lấy danh sách học viên có thể gán vào khóa học (chưa enrolled)")
    public ResponseEntity<ApiResponse<Page<AvailableStudentDTO>>> getAvailableStudents(
            @PathVariable UUID courseId,
            @Parameter(description = "Số trang (bắt đầu từ 0)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Số lượng item trên mỗi trang") @RequestParam(defaultValue = "50") int size,
            @Parameter(description = "Tìm kiếm theo tên hoặc email") @RequestParam(required = false) String search,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            Course course = courseService.getCourseById(courseId);
            if (course == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Khóa học không tồn tại"));
            }

            Pageable pageable = PageRequest.of(page, size);
            Page<User> students = courseService.getAvailableStudentsForEnrollment(courseId, pageable, search);

            Page<AvailableStudentDTO> result = students.map(student -> AvailableStudentDTO.builder()
                    .id(student.getId())
                    .fullName(student.getFullName())
                    .email(student.getEmail())
                    .build());

            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    // Helper methods
    private CourseSummary convertToCourseSummary(Course course) {
        int enrolledCount = 0;
        try {
            enrolledCount = course.getEnrolledStudents() != null ? course.getEnrolledStudents().size() : 0;
        } catch (Exception ignored) {}

        return CourseSummary.builder()
                .id(course.getId())
                .code(course.getCode())
                .title(course.getTitle())
                .description(course.getDescription())
                .status(course.getStatus().name())
                .teacherName(course.getTeacher().getFullName())
                .enrolledCount(enrolledCount)
                .createdAt(course.getCreatedAt())
                .build();
    }

    private CourseSummary convertToCourseSummary(Course course, User currentUser) {
        CourseSummary summary = convertToCourseSummary(course);

        // Add enrollment status for authenticated students
        if (currentUser != null && currentUser.getRole() == User.Role.STUDENT) {
            boolean isEnrolled = userRepository.existsByCourseEnrollment(course.getId(), currentUser.getId());
            summary.setEnrolled(isEnrolled);
        } else {
            summary.setEnrolled(null); 
        }

        return summary;
    }

    private CourseDetail convertToCourseDetail(Course course) {
    int chaptersCount = 0;
    try {
        chaptersCount = course.getChapters() != null ? course.getChapters().size() : 0;
    } catch (Exception ignored) {}

    int enrolledCount = 0;
    try {
        enrolledCount = course.getEnrolledStudents() != null ? course.getEnrolledStudents().size() : 0;
    } catch (Exception ignored) {}

    return CourseDetail.builder()
                .id(course.getId())
                .code(course.getCode())
                .title(course.getTitle())
                .description(course.getDescription())
                .status(course.getStatus().name())
                .teacherId(course.getTeacher().getId())
                .teacherName(course.getTeacher().getFullName())
                .enrolledCount(enrolledCount)
                .chaptersCount(chaptersCount) // Renamed from sectionsCount
                .createdAt(course.getCreatedAt())
                .updatedAt(course.getUpdatedAt())
                .instructorId(course.getInstructorId())
                .teachingStaffIds(course.getTeachingStaffIds())
                .categoryId(course.getCategory() != null ? course.getCategory().getId() : null)
                .categoryName(course.getCategory() != null ? course.getCategory().getName() : null)
                .tags(course.getTags())
                .welcomeMessage(course.getWelcomeMessage())
                .courseInformation(course.getCourseInformation())
                .benefits(course.getBenefits())
                .introVideoUrl(course.getIntroVideoUrl())
                .credits(course.getCredits())
                .visibility(course.getVisibility() != null ? course.getVisibility().name() : "PUBLIC")
                .priceType(course.getPriceType() != null ? course.getPriceType().name() : "FREE")
                .price(course.getPrice())
                .salePrice(course.getSalePrice())
                .build();
    }

    private ChapterResponse convertToChapterResponse(Chapter chapter) {
        List<com.example.lms.entity.Lesson> rawLessons = chapter.getLessons() != null ? chapter.getLessons() : java.util.Collections.emptyList();
        List<LessonSummary> lessons = rawLessons.stream()
                .map(lesson -> {
                    // Get default section/content if available for backward compatibility
                    String defaultContent = null;
                    String defaultVideoUrl = null;
                    if (lesson.getSections() != null && !lesson.getSections().isEmpty()) {
                        Section firstTopic = lesson.getSections().get(0);
                        defaultContent = firstTopic.getContent();
                        defaultVideoUrl = firstTopic.getVideoUrl();
                    }

                    // Map sections (Level 3)
                    List<SectionSummary> sections = lesson.getSections() != null ? 
                         lesson.getSections().stream().map(section -> SectionSummary.builder()
                            .id(section.getId())
                            .title(section.getTitle())
                            .type(section.getType().name())
                            .content(null) // Optimization
                            .videoUrl(null) // Optimization
                            .duration(section.getDuration())
                            .orderIndex(section.getOrderIndex())
                            .isRequired(section.getIsRequired()) // Added
                            .build()
                         ).collect(Collectors.toList()) : java.util.Collections.emptyList();

                    LessonSummary.LessonSummaryBuilder builder = LessonSummary.builder()
                        .id(lesson.getId())
                        .title(lesson.getTitle())
                        .description(lesson.getDescription())
                        .content(null) // Optimization: Don't load content for list view
                        .videoUrl(null) // Optimization: Don't load video for list view
                        .orderIndex(lesson.getOrderIndex())
                        .lessonType(lesson.getLessonType() != null ? lesson.getLessonType().name() : "LECTURE")
                        .sections(sections); // Renamed from topics
                    
                    // Find quiz in sections
                    Quiz quiz = lesson.getSections().stream()
                        .filter(s -> s.getType() == com.example.lms.entity.Section.SectionType.QUIZ)
                        .flatMap(s -> s.getQuizzes().stream())
                        .findFirst()
                        .orElse(null);

                    if (quiz != null) {
                        builder.quizTimeLimit(quiz.getTimeLimitMinutes())
                               .quizMaxScore(quiz.getPassingScore())
                               .quizMaxAttempts(quiz.getMaxAttempts());
                    }
                    
                    if (lesson.getLessonAssignment() != null && lesson.getLessonAssignment().getAssignment() != null) {
                        Assignment assignment = lesson.getLessonAssignment().getAssignment();
                        builder.assignment(AssignmentInfo.builder()
                            .description(assignment.getDescription())
                            .instructions(assignment.getInstructions())
                            .dueDate(assignment.getDueDate() != null ? assignment.getDueDate().toString() : null)
                            .maxScore(assignment.getMaxScore() != null ? assignment.getMaxScore().intValue() : null)
                            .build());
                    }
                    
                    return builder.build();
                })
                .collect(Collectors.toList());

        return ChapterResponse.builder()
                .id(chapter.getId())
                .title(chapter.getTitle())
                .description(chapter.getDescription())
                .orderIndex(chapter.getOrderIndex())
                .lessons(lessons)
                .build();
    }

    // DTOs
    public static class CourseSummary {
        private UUID id;
        private String code;
        private String title;
        private String description;
        private String status;
        private String teacherName;
        private int enrolledCount;
        private Instant createdAt;
        private Boolean enrolled;

        public CourseSummary() {}
        public CourseSummary(UUID id, String code, String title, String description, String status, String teacherName, int enrolledCount, Instant createdAt, Boolean enrolled) {
            this.id = id; this.code = code; this.title = title; this.description = description; this.status = status; this.teacherName = teacherName; this.enrolledCount = enrolledCount; this.createdAt = createdAt; this.enrolled = enrolled;
        }
        // Getters and Setters
        public UUID getId() { return id; } public void setId(UUID id) { this.id = id; }
        public String getCode() { return code; } public void setCode(String code) { this.code = code; }
        public String getTitle() { return title; } public void setTitle(String title) { this.title = title; }
        public String getDescription() { return description; } public void setDescription(String description) { this.description = description; }
        public String getStatus() { return status; } public void setStatus(String status) { this.status = status; }
        public String getTeacherName() { return teacherName; } public void setTeacherName(String teacherName) { this.teacherName = teacherName; }
        public int getEnrolledCount() { return enrolledCount; } public void setEnrolledCount(int enrolledCount) { this.enrolledCount = enrolledCount; }
        public Instant getCreatedAt() { return createdAt; } public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
        public Boolean getEnrolled() { return enrolled; } public void setEnrolled(Boolean enrolled) { this.enrolled = enrolled; }

        public static CourseSummaryBuilder builder() { return new CourseSummaryBuilder(); }
        public static class CourseSummaryBuilder {
            private CourseSummary s = new CourseSummary();
            public CourseSummaryBuilder id(UUID id) { s.setId(id); return this; }
            public CourseSummaryBuilder code(String code) { s.setCode(code); return this; }
            public CourseSummaryBuilder title(String title) { s.setTitle(title); return this; }
            public CourseSummaryBuilder description(String description) { s.setDescription(description); return this; }
            public CourseSummaryBuilder status(String status) { s.setStatus(status); return this; }
            public CourseSummaryBuilder teacherName(String teacherName) { s.setTeacherName(teacherName); return this; }
            public CourseSummaryBuilder enrolledCount(int enrolledCount) { s.setEnrolledCount(enrolledCount); return this; }
            public CourseSummaryBuilder createdAt(Instant createdAt) { s.setCreatedAt(createdAt); return this; }
            public CourseSummaryBuilder enrolled(Boolean enrolled) { s.setEnrolled(enrolled); return this; }
            public CourseSummary build() { return s; }
        }
    }

    public static class CourseDetail {
        private UUID id;
        private String code;
        private String title;
        private String description;
        private String status;
        private UUID teacherId;
        private String teacherName;
        private int enrolledCount;
        private int chaptersCount; 
        private Instant createdAt;
        private Instant updatedAt;
        private UUID instructorId;
        private Set<UUID> teachingStaffIds;
        private UUID categoryId;
        private String categoryName;
        private Set<String> tags;
        private String welcomeMessage;
        private String courseInformation;
        private String benefits;
        private String introVideoUrl;
        private Integer credits;
        private String visibility;
        private String priceType;
        private BigDecimal price;
        private BigDecimal salePrice;

        public CourseDetail() {}
        // Getters and Setters omitted for brevity but required? No, I must include them.
        public UUID getId() { return id; } public void setId(UUID id) { this.id = id; }
        public String getCode() { return code; } public void setCode(String code) { this.code = code; }
        public String getTitle() { return title; } public void setTitle(String title) { this.title = title; }
        public String getDescription() { return description; } public void setDescription(String description) { this.description = description; }
        public String getStatus() { return status; } public void setStatus(String status) { this.status = status; }
        public UUID getTeacherId() { return teacherId; } public void setTeacherId(UUID teacherId) { this.teacherId = teacherId; }
        public String getTeacherName() { return teacherName; } public void setTeacherName(String teacherName) { this.teacherName = teacherName; }
        public int getEnrolledCount() { return enrolledCount; } public void setEnrolledCount(int enrolledCount) { this.enrolledCount = enrolledCount; }
        public int getChaptersCount() { return chaptersCount; } public void setChaptersCount(int chaptersCount) { this.chaptersCount = chaptersCount; }
        public Instant getCreatedAt() { return createdAt; } public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
        public Instant getUpdatedAt() { return updatedAt; } public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
        public UUID getInstructorId() { return instructorId; } public void setInstructorId(UUID instructorId) { this.instructorId = instructorId; }
        public Set<UUID> getTeachingStaffIds() { return teachingStaffIds; } public void setTeachingStaffIds(Set<UUID> teachingStaffIds) { this.teachingStaffIds = teachingStaffIds; }
        public UUID getCategoryId() { return categoryId; } public void setCategoryId(UUID categoryId) { this.categoryId = categoryId; }
        public String getCategoryName() { return categoryName; } public void setCategoryName(String categoryName) { this.categoryName = categoryName; }
        public Set<String> getTags() { return tags; } public void setTags(Set<String> tags) { this.tags = tags; }
        public String getWelcomeMessage() { return welcomeMessage; } public void setWelcomeMessage(String welcomeMessage) { this.welcomeMessage = welcomeMessage; }
        public String getCourseInformation() { return courseInformation; } public void setCourseInformation(String courseInformation) { this.courseInformation = courseInformation; }
        public String getBenefits() { return benefits; } public void setBenefits(String benefits) { this.benefits = benefits; }
        public String getIntroVideoUrl() { return introVideoUrl; } public void setIntroVideoUrl(String introVideoUrl) { this.introVideoUrl = introVideoUrl; }
        public Integer getCredits() { return credits; } public void setCredits(Integer credits) { this.credits = credits; }
        public String getVisibility() { return visibility; } public void setVisibility(String visibility) { this.visibility = visibility; }
        public String getPriceType() { return priceType; } public void setPriceType(String priceType) { this.priceType = priceType; }
        public BigDecimal getPrice() { return price; } public void setPrice(BigDecimal price) { this.price = price; }
        public BigDecimal getSalePrice() { return salePrice; } public void setSalePrice(BigDecimal salePrice) { this.salePrice = salePrice; }

        public static CourseDetailBuilder builder() { return new CourseDetailBuilder(); }
        public static class CourseDetailBuilder {
            private CourseDetail d = new CourseDetail();
            public CourseDetailBuilder id(UUID id) { d.setId(id); return this; }
            public CourseDetailBuilder code(String code) { d.setCode(code); return this; }
            public CourseDetailBuilder title(String title) { d.setTitle(title); return this; }
            public CourseDetailBuilder description(String description) { d.setDescription(description); return this; }
            public CourseDetailBuilder status(String status) { d.setStatus(status); return this; }
            public CourseDetailBuilder teacherId(UUID teacherId) { d.setTeacherId(teacherId); return this; }
            public CourseDetailBuilder teacherName(String teacherName) { d.setTeacherName(teacherName); return this; }
            public CourseDetailBuilder enrolledCount(int enrolledCount) { d.setEnrolledCount(enrolledCount); return this; }
            public CourseDetailBuilder chaptersCount(int chaptersCount) { d.setChaptersCount(chaptersCount); return this; }
            public CourseDetailBuilder createdAt(Instant createdAt) { d.setCreatedAt(createdAt); return this; }
            public CourseDetailBuilder updatedAt(Instant updatedAt) { d.setUpdatedAt(updatedAt); return this; }
            public CourseDetailBuilder instructorId(UUID instructorId) { d.setInstructorId(instructorId); return this; }
            public CourseDetailBuilder teachingStaffIds(Set<UUID> teachingStaffIds) { d.setTeachingStaffIds(teachingStaffIds); return this; }
            public CourseDetailBuilder categoryId(UUID categoryId) { d.setCategoryId(categoryId); return this; }
            public CourseDetailBuilder categoryName(String categoryName) { d.setCategoryName(categoryName); return this; }
            public CourseDetailBuilder tags(Set<String> tags) { d.setTags(tags); return this; }
            public CourseDetailBuilder welcomeMessage(String welcomeMessage) { d.setWelcomeMessage(welcomeMessage); return this; }
            public CourseDetailBuilder courseInformation(String courseInformation) { d.setCourseInformation(courseInformation); return this; }
            public CourseDetailBuilder benefits(String benefits) { d.setBenefits(benefits); return this; }
            public CourseDetailBuilder introVideoUrl(String introVideoUrl) { d.setIntroVideoUrl(introVideoUrl); return this; }
            public CourseDetailBuilder credits(Integer credits) { d.setCredits(credits); return this; }
            public CourseDetailBuilder visibility(String visibility) { d.setVisibility(visibility); return this; }
            public CourseDetailBuilder priceType(String priceType) { d.setPriceType(priceType); return this; }
            public CourseDetailBuilder price(BigDecimal price) { d.setPrice(price); return this; }
            public CourseDetailBuilder salePrice(BigDecimal salePrice) { d.setSalePrice(salePrice); return this; }
            public CourseDetail build() { return d; }
        }
    }

    public static class ChapterResponse {
        private UUID id;
        private String title;
        private String description;
        private Integer orderIndex;
        private List<LessonSummary> lessons;

        public ChapterResponse() {}
        public UUID getId() { return id; } public void setId(UUID id) { this.id = id; }
        public String getTitle() { return title; } public void setTitle(String title) { this.title = title; }
        public String getDescription() { return description; } public void setDescription(String description) { this.description = description; }
        public Integer getOrderIndex() { return orderIndex; } public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
        public List<LessonSummary> getLessons() { return lessons; } public void setLessons(List<LessonSummary> lessons) { this.lessons = lessons; }

        public static ChapterResponseBuilder builder() { return new ChapterResponseBuilder(); }
        public static class ChapterResponseBuilder {
            private ChapterResponse c = new ChapterResponse();
            public ChapterResponseBuilder id(UUID id) { c.setId(id); return this; }
            public ChapterResponseBuilder title(String title) { c.setTitle(title); return this; }
            public ChapterResponseBuilder description(String description) { c.setDescription(description); return this; }
            public ChapterResponseBuilder orderIndex(Integer orderIndex) { c.setOrderIndex(orderIndex); return this; }
            public ChapterResponseBuilder lessons(List<LessonSummary> lessons) { c.setLessons(lessons); return this; }
            public ChapterResponse build() { return c; }
        }
    }

    public static class SectionSummary {
        private UUID id;
        private String title;
        private String type;
        private String content;
        private String videoUrl;
        private Integer duration;
        private Integer orderIndex;
        private Boolean isRequired;

        public SectionSummary() {}
        public UUID getId() { return id; } public void setId(UUID id) { this.id = id; }
        public String getTitle() { return title; } public void setTitle(String title) { this.title = title; }
        public String getType() { return type; } public void setType(String type) { this.type = type; }
        public String getContent() { return content; } public void setContent(String content) { this.content = content; }
        public String getVideoUrl() { return videoUrl; } public void setVideoUrl(String videoUrl) { this.videoUrl = videoUrl; }
        public Integer getDuration() { return duration; } public void setDuration(Integer duration) { this.duration = duration; }
        public Integer getOrderIndex() { return orderIndex; } public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
        public Boolean getIsRequired() { return isRequired; } public void setIsRequired(Boolean isRequired) { this.isRequired = isRequired; }

        public static SectionSummaryBuilder builder() { return new SectionSummaryBuilder(); }
        public static class SectionSummaryBuilder {
            private SectionSummary s = new SectionSummary();
            public SectionSummaryBuilder id(UUID id) { s.setId(id); return this; }
            public SectionSummaryBuilder title(String title) { s.setTitle(title); return this; }
            public SectionSummaryBuilder type(String type) { s.setType(type); return this; }
            public SectionSummaryBuilder content(String content) { s.setContent(content); return this; }
            public SectionSummaryBuilder videoUrl(String videoUrl) { s.setVideoUrl(videoUrl); return this; }
            public SectionSummaryBuilder duration(Integer duration) { s.setDuration(duration); return this; }
            public SectionSummaryBuilder orderIndex(Integer orderIndex) { s.setOrderIndex(orderIndex); return this; }
            public SectionSummaryBuilder isRequired(Boolean isRequired) { s.setIsRequired(isRequired); return this; }
            public SectionSummary build() { return s; }
        }
    }

    public static class LessonSummary {
        private UUID id;
        private String title;
        private String description;
        private String content; 
        private String videoUrl; 
        private Integer orderIndex;
        private String lessonType;
        private Integer quizTimeLimit;
        private Integer quizMaxScore;
        private Integer quizMaxAttempts;
        private AssignmentInfo assignment;
        private List<SectionSummary> sections;

        public LessonSummary() {}
        public UUID getId() { return id; } public void setId(UUID id) { this.id = id; }
        public String getTitle() { return title; } public void setTitle(String title) { this.title = title; }
        public String getDescription() { return description; } public void setDescription(String description) { this.description = description; }
        public String getContent() { return content; } public void setContent(String content) { this.content = content; }
        public String getVideoUrl() { return videoUrl; } public void setVideoUrl(String videoUrl) { this.videoUrl = videoUrl; }
        public Integer getOrderIndex() { return orderIndex; } public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
        public String getLessonType() { return lessonType; } public void setLessonType(String lessonType) { this.lessonType = lessonType; }
        public Integer getQuizTimeLimit() { return quizTimeLimit; } public void setQuizTimeLimit(Integer quizTimeLimit) { this.quizTimeLimit = quizTimeLimit; }
        public Integer getQuizMaxScore() { return quizMaxScore; } public void setQuizMaxScore(Integer quizMaxScore) { this.quizMaxScore = quizMaxScore; }
        public Integer getQuizMaxAttempts() { return quizMaxAttempts; } public void setQuizMaxAttempts(Integer quizMaxAttempts) { this.quizMaxAttempts = quizMaxAttempts; }
        public AssignmentInfo getAssignment() { return assignment; } public void setAssignment(AssignmentInfo assignment) { this.assignment = assignment; }
        public List<SectionSummary> getSections() { return sections; } public void setSections(List<SectionSummary> sections) { this.sections = sections; }

        public static LessonSummaryBuilder builder() { return new LessonSummaryBuilder(); }
        public static class LessonSummaryBuilder {
            private LessonSummary l = new LessonSummary();
            public LessonSummaryBuilder id(UUID id) { l.setId(id); return this; }
            public LessonSummaryBuilder title(String title) { l.setTitle(title); return this; }
            public LessonSummaryBuilder description(String description) { l.setDescription(description); return this; }
            public LessonSummaryBuilder content(String content) { l.setContent(content); return this; }
            public LessonSummaryBuilder videoUrl(String videoUrl) { l.setVideoUrl(videoUrl); return this; }
            public LessonSummaryBuilder orderIndex(Integer orderIndex) { l.setOrderIndex(orderIndex); return this; }
            public LessonSummaryBuilder lessonType(String lessonType) { l.setLessonType(lessonType); return this; }
            public LessonSummaryBuilder quizTimeLimit(Integer quizTimeLimit) { l.setQuizTimeLimit(quizTimeLimit); return this; }
            public LessonSummaryBuilder quizMaxScore(Integer quizMaxScore) { l.setQuizMaxScore(quizMaxScore); return this; }
            public LessonSummaryBuilder quizMaxAttempts(Integer quizMaxAttempts) { l.setQuizMaxAttempts(quizMaxAttempts); return this; }
            public LessonSummaryBuilder assignment(AssignmentInfo assignment) { l.setAssignment(assignment); return this; }
            public LessonSummaryBuilder sections(List<SectionSummary> sections) { l.setSections(sections); return this; }
            public LessonSummary build() { return l; }
        }
    }

    public static class AssignmentInfo {
        private String description;
        private String instructions;
        private String dueDate;
        private Integer maxScore;

        public AssignmentInfo() {}
        public String getDescription() { return description; } public void setDescription(String description) { this.description = description; }
        public String getInstructions() { return instructions; } public void setInstructions(String instructions) { this.instructions = instructions; }
        public String getDueDate() { return dueDate; } public void setDueDate(String dueDate) { this.dueDate = dueDate; }
        public Integer getMaxScore() { return maxScore; } public void setMaxScore(Integer maxScore) { this.maxScore = maxScore; }

        public static AssignmentInfoBuilder builder() { return new AssignmentInfoBuilder(); }
        public static class AssignmentInfoBuilder {
            private AssignmentInfo a = new AssignmentInfo();
            public AssignmentInfoBuilder description(String description) { a.setDescription(description); return this; }
            public AssignmentInfoBuilder instructions(String instructions) { a.setInstructions(instructions); return this; }
            public AssignmentInfoBuilder dueDate(String dueDate) { a.setDueDate(dueDate); return this; }
            public AssignmentInfoBuilder maxScore(Integer maxScore) { a.setMaxScore(maxScore); return this; }
            public AssignmentInfo build() { return a; }
        }
    }

    public static class CreateCourseRequest {
        @NotBlank(message = "Mã khóa học không được để trống")
        @Size(max = 64, message = "Mã khóa học không được vượt quá 64 ký tự")
        private String code;

        @NotBlank(message = "Tên khóa học không được để trống")
        @Size(max = 255, message = "Tên khóa học không được vượt quá 255 ký tự")
        private String title;

        private String description;
        private UUID instructorId;
        private UUID categoryId;
        private Set<UUID> teachingStaffIds;
        private Set<String> tags;
        private String welcomeMessage;
        private String courseInformation;
        private String benefits;
        private String introVideoUrl;
        private Integer credits;
        private String visibility;
        private String priceType;
        private BigDecimal price;
        private BigDecimal salePrice;
        
        public CreateCourseRequest() {}
        public String getCode() { return code; } public void setCode(String code) { this.code = code; }
        public String getTitle() { return title; } public void setTitle(String title) { this.title = title; }
        public String getDescription() { return description; } public void setDescription(String description) { this.description = description; }
        public UUID getInstructorId() { return instructorId; } public void setInstructorId(UUID instructorId) { this.instructorId = instructorId; }
        public UUID getCategoryId() { return categoryId; } public void setCategoryId(UUID categoryId) { this.categoryId = categoryId; }
        public Set<UUID> getTeachingStaffIds() { return teachingStaffIds; } public void setTeachingStaffIds(Set<UUID> teachingStaffIds) { this.teachingStaffIds = teachingStaffIds; }
        public Set<String> getTags() { return tags; } public void setTags(Set<String> tags) { this.tags = tags; }
        public String getWelcomeMessage() { return welcomeMessage; } public void setWelcomeMessage(String welcomeMessage) { this.welcomeMessage = welcomeMessage; }
        public String getCourseInformation() { return courseInformation; } public void setCourseInformation(String courseInformation) { this.courseInformation = courseInformation; }
        public String getBenefits() { return benefits; } public void setBenefits(String benefits) { this.benefits = benefits; }
        public String getIntroVideoUrl() { return introVideoUrl; } public void setIntroVideoUrl(String introVideoUrl) { this.introVideoUrl = introVideoUrl; }
        public Integer getCredits() { return credits; } public void setCredits(Integer credits) { this.credits = credits; }
        public String getVisibility() { return visibility; } public void setVisibility(String visibility) { this.visibility = visibility; }
        public String getPriceType() { return priceType; } public void setPriceType(String priceType) { this.priceType = priceType; }
        public BigDecimal getPrice() { return price; } public void setPrice(BigDecimal price) { this.price = price; }
        public BigDecimal getSalePrice() { return salePrice; } public void setSalePrice(BigDecimal salePrice) { this.salePrice = salePrice; }
    }

    public static class UpdateCourseRequest {
        @Size(max = 64, message = "Mã khóa học không được vượt quá 64 ký tự")
        private String code;

        @Size(max = 255, message = "Tên khóa học không được vượt quá 255 ký tự")
        private String title;

        private String description;
        private UUID instructorId;
        private UUID categoryId;
        private Set<UUID> teachingStaffIds;
        private Set<String> tags;
        private String welcomeMessage;
        private String courseInformation;
        private String benefits;
        private String introVideoUrl;
        private Integer credits;
        private String visibility;
        private String priceType;
        private BigDecimal price;
        private BigDecimal salePrice;
        
        public UpdateCourseRequest() {}
        public String getCode() { return code; } public void setCode(String code) { this.code = code; }
        public String getTitle() { return title; } public void setTitle(String title) { this.title = title; }
        public String getDescription() { return description; } public void setDescription(String description) { this.description = description; }
        public UUID getInstructorId() { return instructorId; } public void setInstructorId(UUID instructorId) { this.instructorId = instructorId; }
        public UUID getCategoryId() { return categoryId; } public void setCategoryId(UUID categoryId) { this.categoryId = categoryId; }
        public Set<UUID> getTeachingStaffIds() { return teachingStaffIds; } public void setTeachingStaffIds(Set<UUID> teachingStaffIds) { this.teachingStaffIds = teachingStaffIds; }
        public Set<String> getTags() { return tags; } public void setTags(Set<String> tags) { this.tags = tags; }
        public String getWelcomeMessage() { return welcomeMessage; } public void setWelcomeMessage(String welcomeMessage) { this.welcomeMessage = welcomeMessage; }
        public String getCourseInformation() { return courseInformation; } public void setCourseInformation(String courseInformation) { this.courseInformation = courseInformation; }
        public String getBenefits() { return benefits; } public void setBenefits(String benefits) { this.benefits = benefits; }
        public String getIntroVideoUrl() { return introVideoUrl; } public void setIntroVideoUrl(String introVideoUrl) { this.introVideoUrl = introVideoUrl; }
        public Integer getCredits() { return credits; } public void setCredits(Integer credits) { this.credits = credits; }
        public String getVisibility() { return visibility; } public void setVisibility(String visibility) { this.visibility = visibility; }
        public String getPriceType() { return priceType; } public void setPriceType(String priceType) { this.priceType = priceType; }
        public BigDecimal getPrice() { return price; } public void setPrice(BigDecimal price) { this.price = price; }
        public BigDecimal getSalePrice() { return salePrice; } public void setSalePrice(BigDecimal salePrice) { this.salePrice = salePrice; }
    }

    public static class EnrollStudentRequest {
        @NotBlank(message = "Email không được để trống")
        private String email;
        
        public EnrollStudentRequest() {}
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
    }

    public static class EnrolledStudentInfo {
        private UUID id;
        private String fullName;
        private String email;
        private Instant enrolledAt;

        public EnrolledStudentInfo() {}
        public UUID getId() { return id; } public void setId(UUID id) { this.id = id; }
        public String getFullName() { return fullName; } public void setFullName(String fullName) { this.fullName = fullName; }
        public String getEmail() { return email; } public void setEmail(String email) { this.email = email; }
        public Instant getEnrolledAt() { return enrolledAt; } public void setEnrolledAt(Instant enrolledAt) { this.enrolledAt = enrolledAt; }

        public static EnrolledStudentInfoBuilder builder() { return new EnrolledStudentInfoBuilder(); }
        public static class EnrolledStudentInfoBuilder {
            private EnrolledStudentInfo e = new EnrolledStudentInfo();
            public EnrolledStudentInfoBuilder id(UUID id) { e.setId(id); return this; }
            public EnrolledStudentInfoBuilder fullName(String fullName) { e.setFullName(fullName); return this; }
            public EnrolledStudentInfoBuilder email(String email) { e.setEmail(email); return this; }
            public EnrolledStudentInfoBuilder enrolledAt(Instant enrolledAt) { e.setEnrolledAt(enrolledAt); return this; }
            public EnrolledStudentInfo build() { return e; }
        }
    }
    
    public static class AvailableStudentDTO {
        private UUID id;
        private String fullName;
        private String email;

        public AvailableStudentDTO() {}
        public UUID getId() { return id; } public void setId(UUID id) { this.id = id; }
        public String getFullName() { return fullName; } public void setFullName(String fullName) { this.fullName = fullName; }
        public String getEmail() { return email; } public void setEmail(String email) { this.email = email; }

        public static AvailableStudentDTOBuilder builder() { return new AvailableStudentDTOBuilder(); }
        public static class AvailableStudentDTOBuilder {
            private AvailableStudentDTO a = new AvailableStudentDTO();
            public AvailableStudentDTOBuilder id(UUID id) { a.setId(id); return this; }
            public AvailableStudentDTOBuilder fullName(String fullName) { a.setFullName(fullName); return this; }
            public AvailableStudentDTOBuilder email(String email) { a.setEmail(email); return this; }
            public AvailableStudentDTO build() { return a; }
        }
    }

    public static class CourseReviewStatus {
        private UUID courseId;
        private String status;
        private String reviewComment;
        private Instant reviewedAt;
        private String reviewedByName;

        public CourseReviewStatus() {}
        public UUID getCourseId() { return courseId; } public void setCourseId(UUID courseId) { this.courseId = courseId; }
        public String getStatus() { return status; } public void setStatus(String status) { this.status = status; }
        public String getReviewComment() { return reviewComment; } public void setReviewComment(String reviewComment) { this.reviewComment = reviewComment; }
        public Instant getReviewedAt() { return reviewedAt; } public void setReviewedAt(Instant reviewedAt) { this.reviewedAt = reviewedAt; }
        public String getReviewedByName() { return reviewedByName; } public void setReviewedByName(String reviewedByName) { this.reviewedByName = reviewedByName; }

        public static CourseReviewStatusBuilder builder() { return new CourseReviewStatusBuilder(); }
        public static class CourseReviewStatusBuilder {
            private CourseReviewStatus c = new CourseReviewStatus();
            public CourseReviewStatusBuilder courseId(UUID courseId) { c.setCourseId(courseId); return this; }
            public CourseReviewStatusBuilder status(String status) { c.setStatus(status); return this; }
            public CourseReviewStatusBuilder reviewComment(String reviewComment) { c.setReviewComment(reviewComment); return this; }
            public CourseReviewStatusBuilder reviewedAt(Instant reviewedAt) { c.setReviewedAt(reviewedAt); return this; }
            public CourseReviewStatusBuilder reviewedByName(String reviewedByName) { c.setReviewedByName(reviewedByName); return this; }
            public CourseReviewStatus build() { return c; }
        }
    }
}
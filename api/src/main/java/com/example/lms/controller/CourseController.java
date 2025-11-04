package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.entity.Course;
import com.example.lms.entity.Section;
import com.example.lms.entity.User;
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
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/courses")
@RequiredArgsConstructor
@Tag(name = "Course Management", description = "API quản lý khóa học")
public class CourseController {

    private final CourseService courseService;
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
    @Operation(summary = "Tạo khóa học mới", description = "Giảng viên tạo khóa học mới và được duyệt ngay (không cần phê duyệt)")
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
    public ResponseEntity<ApiResponse<Page<CourseSummary>>> getMyCourses(
            @AuthenticationPrincipal User currentUser,
            @Parameter(description = "Số trang (bắt đầu từ 1)") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "Số lượng item trên mỗi trang") @RequestParam(defaultValue = "10") int limit
    ) {
        try {
            Pageable pageable = PageRequest.of(page - 1, limit);
            Page<Course> courses = courseService.getCoursesByTeacher(currentUser, pageable);
            
            Page<CourseSummary> courseSummaries = courses.map(this::convertToCourseSummary);
            
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
    @Operation(summary = "Lấy thông tin chi tiết khóa học", description = "Lấy thông tin chi tiết của một khóa học")
    public ResponseEntity<ApiResponse<CourseDetail>> getCourseById(@PathVariable UUID courseId) {
        try {
            Course course = courseService.getCourseById(courseId);
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

    @PatchMapping("/{courseId}/publish")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Đánh dấu khóa học đã duyệt", description = "Bỏ quy trình duyệt: thao tác này đảm bảo khóa học ở trạng thái APPROVED")
    public ResponseEntity<ApiResponse<String>> publishCourse(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            courseService.submitForApproval(courseId, currentUser);
            return ResponseEntity.ok(ApiResponse.success("Khóa học đã được gửi để duyệt"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
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
    @Operation(summary = "Đăng ký khóa học", description = "Học viên đăng ký vào khóa học")
    public ResponseEntity<?> enrollCourse(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            courseService.enrollStudent(courseId, currentUser.getId());
            return ResponseEntity.ok(Map.of("message", "Đăng ký thành công!"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{courseId}/content")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lấy nội dung khóa học", description = "Lấy toàn bộ sections và lessons của khóa học")
    public ResponseEntity<ApiResponse<List<SectionWithLessons>>> getCourseContent(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            List<Section> sections = courseService.getCourseContent(courseId, currentUser);
            List<SectionWithLessons> content = sections.stream()
                    .map(this::convertToSectionWithLessons)
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
            // Use database query to check enrollment status without loading lazy collections
            boolean isEnrolled = userRepository.existsByCourseEnrollment(course.getId(), currentUser.getId());
            summary.setEnrolled(isEnrolled);
        } else {
            summary.setEnrolled(null); // Not enrolled or not a student
        }

        return summary;
    }

    private CourseDetail convertToCourseDetail(Course course) {
    int sectionsCount = 0;
    try {
        sectionsCount = course.getSections() != null ? course.getSections().size() : 0;
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
        .sectionsCount(sectionsCount)
                .createdAt(course.getCreatedAt())
                .updatedAt(course.getUpdatedAt())
                .build();
    }

    private SectionWithLessons convertToSectionWithLessons(Section section) {
        List<com.example.lms.entity.Lesson> rawLessons = section.getLessons() != null ? section.getLessons() : java.util.Collections.emptyList();
        List<LessonSummary> lessons = rawLessons.stream()
                .map(lesson -> LessonSummary.builder()
                        .id(lesson.getId())
                        .title(lesson.getTitle())
                        .description(lesson.getDescription())
                        .orderIndex(lesson.getOrderIndex())
                        .build())
                .collect(Collectors.toList());

        return SectionWithLessons.builder()
                .id(section.getId())
                .title(section.getTitle())
                .description(section.getDescription())
                .orderIndex(section.getOrderIndex())
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

        public static CourseSummaryBuilder builder() {
            return new CourseSummaryBuilder();
        }

        public static class CourseSummaryBuilder {
            private UUID id;
            private String code;
            private String title;
            private String description;
            private String status;
            private String teacherName;
            private int enrolledCount;
            private Instant createdAt;
            private Boolean enrolled;

            public CourseSummaryBuilder id(UUID id) { this.id = id; return this; }
            public CourseSummaryBuilder code(String code) { this.code = code; return this; }
            public CourseSummaryBuilder title(String title) { this.title = title; return this; }
            public CourseSummaryBuilder description(String description) { this.description = description; return this; }
            public CourseSummaryBuilder status(String status) { this.status = status; return this; }
            public CourseSummaryBuilder teacherName(String teacherName) { this.teacherName = teacherName; return this; }
            public CourseSummaryBuilder enrolledCount(int enrolledCount) { this.enrolledCount = enrolledCount; return this; }
            public CourseSummaryBuilder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
            public CourseSummaryBuilder enrolled(Boolean enrolled) { this.enrolled = enrolled; return this; }

            public CourseSummary build() {
                CourseSummary course = new CourseSummary();
                course.id = this.id;
                course.code = this.code;
                course.title = this.title;
                course.description = this.description;
                course.status = this.status;
                course.teacherName = this.teacherName;
                course.enrolledCount = this.enrolledCount;
                course.createdAt = this.createdAt;
                course.enrolled = this.enrolled;
                return course;
            }
        }

        // Getters
        public UUID getId() { return id; }
        public String getCode() { return code; }
        public String getTitle() { return title; }
        public String getDescription() { return description; }
        public String getStatus() { return status; }
        public String getTeacherName() { return teacherName; }
        public int getEnrolledCount() { return enrolledCount; }
        public Instant getCreatedAt() { return createdAt; }
        public Boolean getEnrolled() { return enrolled; }
        public void setEnrolled(Boolean enrolled) { this.enrolled = enrolled; }
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
        private int sectionsCount;
        private Instant createdAt;
        private Instant updatedAt;

        public static CourseDetailBuilder builder() {
            return new CourseDetailBuilder();
        }

        public static class CourseDetailBuilder {
            private UUID id;
            private String code;
            private String title;
            private String description;
            private String status;
            private UUID teacherId;
            private String teacherName;
            private int enrolledCount;
            private int sectionsCount;
            private Instant createdAt;
            private Instant updatedAt;

            public CourseDetailBuilder id(UUID id) { this.id = id; return this; }
            public CourseDetailBuilder code(String code) { this.code = code; return this; }
            public CourseDetailBuilder title(String title) { this.title = title; return this; }
            public CourseDetailBuilder description(String description) { this.description = description; return this; }
            public CourseDetailBuilder status(String status) { this.status = status; return this; }
            public CourseDetailBuilder teacherId(UUID teacherId) { this.teacherId = teacherId; return this; }
            public CourseDetailBuilder teacherName(String teacherName) { this.teacherName = teacherName; return this; }
            public CourseDetailBuilder enrolledCount(int enrolledCount) { this.enrolledCount = enrolledCount; return this; }
            public CourseDetailBuilder sectionsCount(int sectionsCount) { this.sectionsCount = sectionsCount; return this; }
            public CourseDetailBuilder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
            public CourseDetailBuilder updatedAt(Instant updatedAt) { this.updatedAt = updatedAt; return this; }

            public CourseDetail build() {
                CourseDetail course = new CourseDetail();
                course.id = this.id;
                course.code = this.code;
                course.title = this.title;
                course.description = this.description;
                course.status = this.status;
                course.teacherId = this.teacherId;
                course.teacherName = this.teacherName;
                course.enrolledCount = this.enrolledCount;
                course.sectionsCount = this.sectionsCount;
                course.createdAt = this.createdAt;
                course.updatedAt = this.updatedAt;
                return course;
            }
        }

        // Getters
        public UUID getId() { return id; }
        public String getCode() { return code; }
        public String getTitle() { return title; }
        public String getDescription() { return description; }
        public String getStatus() { return status; }
        public UUID getTeacherId() { return teacherId; }
        public String getTeacherName() { return teacherName; }
        public int getEnrolledCount() { return enrolledCount; }
        public int getSectionsCount() { return sectionsCount; }
        public Instant getCreatedAt() { return createdAt; }
        public Instant getUpdatedAt() { return updatedAt; }
    }

    public static class SectionWithLessons {
        private UUID id;
        private String title;
        private String description;
        private Integer orderIndex;
        private List<LessonSummary> lessons;

        public static SectionWithLessonsBuilder builder() {
            return new SectionWithLessonsBuilder();
        }

        public static class SectionWithLessonsBuilder {
            private UUID id;
            private String title;
            private String description;
            private Integer orderIndex;
            private List<LessonSummary> lessons;

            public SectionWithLessonsBuilder id(UUID id) { this.id = id; return this; }
            public SectionWithLessonsBuilder title(String title) { this.title = title; return this; }
            public SectionWithLessonsBuilder description(String description) { this.description = description; return this; }
            public SectionWithLessonsBuilder orderIndex(Integer orderIndex) { this.orderIndex = orderIndex; return this; }
            public SectionWithLessonsBuilder lessons(List<LessonSummary> lessons) { this.lessons = lessons; return this; }

            public SectionWithLessons build() {
                SectionWithLessons section = new SectionWithLessons();
                section.id = this.id;
                section.title = this.title;
                section.description = this.description;
                section.orderIndex = this.orderIndex;
                section.lessons = this.lessons;
                return section;
            }
        }

        // Getters
        public UUID getId() { return id; }
        public String getTitle() { return title; }
        public String getDescription() { return description; }
        public Integer getOrderIndex() { return orderIndex; }
        public List<LessonSummary> getLessons() { return lessons; }
    }

    public static class LessonSummary {
        private UUID id;
        private String title;
        private String description;
        private Integer orderIndex;

        public static LessonSummaryBuilder builder() {
            return new LessonSummaryBuilder();
        }

        public static class LessonSummaryBuilder {
            private UUID id;
            private String title;
            private String description;
            private Integer orderIndex;

            public LessonSummaryBuilder id(UUID id) { this.id = id; return this; }
            public LessonSummaryBuilder title(String title) { this.title = title; return this; }
            public LessonSummaryBuilder description(String description) { this.description = description; return this; }
            public LessonSummaryBuilder orderIndex(Integer orderIndex) { this.orderIndex = orderIndex; return this; }

            public LessonSummary build() {
                LessonSummary lesson = new LessonSummary();
                lesson.id = this.id;
                lesson.title = this.title;
                lesson.description = this.description;
                lesson.orderIndex = this.orderIndex;
                return lesson;
            }
        }

        // Getters
        public UUID getId() { return id; }
        public String getTitle() { return title; }
        public String getDescription() { return description; }
        public Integer getOrderIndex() { return orderIndex; }
    }

    public static class CreateCourseRequest {
        @NotBlank(message = "Mã khóa học không được để trống")
        @Size(max = 64, message = "Mã khóa học không được vượt quá 64 ký tự")
        private String code;

        @NotBlank(message = "Tên khóa học không được để trống")
        @Size(max = 255, message = "Tên khóa học không được vượt quá 255 ký tự")
        private String title;

        private String description;

        // Getters and Setters
        public String getCode() { return code; }
        public void setCode(String code) { this.code = code; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
    }

    public static class UpdateCourseRequest {
        @Size(max = 64, message = "Mã khóa học không được vượt quá 64 ký tự")
        private String code;

        @Size(max = 255, message = "Tên khóa học không được vượt quá 255 ký tự")
        private String title;

        private String description;

        // Getters and Setters
        public String getCode() { return code; }
        public void setCode(String code) { this.code = code; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
    }

    // Request for teacher/admin enrollment - simplified to email only
    public static class EnrollStudentRequest {
        @NotBlank(message = "Email không được để trống")
        private String email;

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
    }
}
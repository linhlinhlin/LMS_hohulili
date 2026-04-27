package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseCategoryJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CourseCategoryJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.ChapterJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.ChapterJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.entity.LessonJpaEntity;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentSubmissionJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.QuizAttemptJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.QuizJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentSubmissionJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizAttemptJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizJpaRepositoryV3;
import com.example.lms.learning_delivery.application.dto.SelfEnrollCommand;
import com.example.lms.learning_delivery.application.usecase.CertificateUseCase;
import com.example.lms.learning_delivery.application.usecase.SelfEnrollUseCase;
import com.example.lms.learning_delivery.infrastructure.persistence.CertificateJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.EnrollmentRepositoryImpl;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepository;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * V3 Controller for Student Enrollment queries.
 * Provides endpoints for students to view their enrolled courses.
 */
@Tag(name = "Student Enrollment V3", description = "Student enrollment query endpoints")
@RestController
@RequestMapping("/api/v3/student")
@RequiredArgsConstructor
public class StudentEnrollmentControllerV3 {

    private final EnrollmentRepositoryImpl enrollmentRepository;
    private final LearningClassRepository learningClassRepository;
    private final JpaCourseRepository courseJpaRepository;
    private final UserJpaRepository userJpaRepository;
    private final CourseCategoryJpaRepository categoryJpaRepository;
    private final ChapterJpaRepository chapterJpaRepository;
    private final LessonJpaRepository lessonJpaRepository;
    private final CertificateJpaRepository certificateRepository;
    private final CertificateUseCase certificateUseCase;
    private final SelfEnrollUseCase selfEnrollUseCase;
    private final AssignmentJpaRepository assignmentJpaRepository;
    private final AssignmentSubmissionJpaRepository submissionJpaRepository;
    private final QuizJpaRepositoryV3 quizJpaRepository;
    private final QuizAttemptJpaRepository quizAttemptJpaRepository;
    private final com.example.lms.shared.infrastructure.persistence.repository.PaymentTransactionJpaRepository paymentTransactionJpaRepository;

    @Operation(summary = "Get student's enrolled courses")
    @GetMapping("/courses/enrolled")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Page<EnrolledCourseResponse>>> getEnrolledCourses(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        if (currentUser == null) {
            return ResponseEntity.ok(ApiResponse.success(
                new PageImpl<>(Collections.emptyList(), PageRequest.of(0, Math.max(1, size)), 0),
                "Xác thực người dùng không thành công"
            ));
        }

        UUID studentId = currentUser.getId();
        
        // SOTA: Fetch ACTIVE + COMPLETED enrollments (Canvas/Coursera pattern)
        // Students see both in-progress and completed courses in their dashboard
        List<Enrollment> enrollments = enrollmentRepository.findActiveAndCompletedWithClass(studentId);
        
        // Group enrollments by courseId (LearningClass already loaded via JOIN FETCH)
        Map<UUID, List<Enrollment>> courseEnrollments = enrollments.stream()
                .filter(e -> e.getLearningClass() != null)
                .collect(Collectors.groupingBy(e -> e.getLearningClass().getCourseId()));
        
        // Batch-load course data to avoid N+1 (SOTA: single query per entity type)
        Set<UUID> courseIds = courseEnrollments.keySet();
        Map<UUID, CourseJpaEntity> courseMap = courseJpaRepository.findAllById(courseIds).stream()
                .collect(Collectors.toMap(CourseJpaEntity::getId, c -> c));

        // Batch-load teacher names
        Set<UUID> teacherIds = courseMap.values().stream()
                .map(CourseJpaEntity::getTeacherId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<UUID, String> teacherNameMap = userJpaRepository.findAllById(teacherIds).stream()
                .collect(Collectors.toMap(UserJpaEntity::getId, UserJpaEntity::getFullName));

        // Batch-load category names (1 query)
        Set<UUID> categoryIds = courseMap.values().stream()
                .map(CourseJpaEntity::getCategoryId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<UUID, String> categoryNameMap = categoryIds.isEmpty() ? Map.of()
                : categoryJpaRepository.findAllById(categoryIds).stream()
                        .collect(Collectors.toMap(CourseCategoryJpaEntity::getId, CourseCategoryJpaEntity::getName));

        // Batch count lessons: chapters → lessons (2 queries instead of N*C)
        List<ChapterJpaEntity> allChapters = chapterJpaRepository.findByCourseIdInOrderByOrderIndex(new ArrayList<>(courseIds));
        List<UUID> chapterIds = allChapters.stream().map(ChapterJpaEntity::getId).toList();
        Map<UUID, UUID> chapterToCourse = allChapters.stream()
                .collect(Collectors.toMap(ChapterJpaEntity::getId, ChapterJpaEntity::getCourseId));
        // Count lessons per course
        Map<UUID, Long> lessonCountMap = new HashMap<>();
        if (!chapterIds.isEmpty()) {
            List<LessonJpaEntity> allLessons = lessonJpaRepository.findByChapterIdIn(chapterIds);
            for (LessonJpaEntity lesson : allLessons) {
                UUID cId = chapterToCourse.get(lesson.getChapterId());
                if (cId != null) {
                    lessonCountMap.merge(cId, 1L, Long::sum);
                }
            }
        }

        // Batch check which PAID courses the student has completed payment for (1 query)
        Set<UUID> paidCourseIds = !courseIds.isEmpty()
                ? new HashSet<>(paymentTransactionJpaRepository.findPaidCourseIds(
                        studentId, courseIds,
                        com.example.lms.shared.infrastructure.persistence.entity.PaymentTransactionJpaEntity.PaymentStatus.COMPLETED))
                : Set.of();

        // Build response with real course data
        List<EnrolledCourseResponse> courseResponses = courseEnrollments.entrySet().stream()
                .map(entry -> {
                    UUID courseId = entry.getKey();
                    // Use most recent enrollment (by enrolledAt) instead of .get(0)
                    Enrollment enrollment = entry.getValue().stream()
                            .max(Comparator.comparing(
                                    e -> e.getEnrolledAt() != null ? e.getEnrolledAt() : Instant.EPOCH))
                            .orElse(entry.getValue().getFirst());
                    LearningClass lc = enrollment.getLearningClass();
                    CourseJpaEntity course = courseMap.get(courseId);

                    String description = course != null && course.getDescription() != null
                            ? course.getDescription() : "";
                    String teacherName = "";
                    if (course != null && course.getTeacherId() != null) {
                        teacherName = teacherNameMap.getOrDefault(course.getTeacherId(), "");
                    }

                    String categoryName = null;
                    if (course != null && course.getCategoryId() != null) {
                        categoryName = categoryNameMap.get(course.getCategoryId());
                    }

                    return EnrolledCourseResponse.builder()
                            .id(courseId.toString())
                            .title(course != null ? course.getTitle() : lc.getName())
                            .description(description)
                            .teacherName(teacherName)
                            .categoryName(categoryName)
                            .thumbnailUrl(course != null ? (course.getThumbnailUrl() != null ? course.getThumbnailUrl() : course.getIntroVideoUrl()) : null)
                            .status(enrollment.getStatus().name().toLowerCase())
                            .progress(enrollment.getCompletionPercent() != null ? enrollment.getCompletionPercent() : 0)
                            .totalLessons(lessonCountMap.getOrDefault(courseId, 0L).intValue())
                            .completedLessons(enrollment.getProgress() != null
                                ? (int) enrollment.getProgress().values().stream().filter(p -> "COMPLETED".equals(p.getStatus())).count()
                                : 0)
                            .enrolledAt(enrollment.getEnrolledAt() != null ? enrollment.getEnrolledAt().toString() : null)
                            .lastAccessedAt(enrollment.getLastAccessedAt() != null ? enrollment.getLastAccessedAt().toString() : null)
                            .priceType(course != null && course.getPriceType() != null ? course.getPriceType().name() : "FREE")
                            .allowOfflineDownload(course != null && course.isAllowOfflineDownload())
                            .isPaid(course == null
                                    || course.getPriceType() == com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity.PriceType.FREE
                                    || paidCourseIds.contains(courseId))
                            .deliveryMode(course != null && course.getDeliveryMode() != null ? course.getDeliveryMode().name() : "SELF_PACED")
                            .build();
                })
                .collect(Collectors.toList());

        // Sort by lastAccessedAt DESC (SOTA: Canvas/Coursera "most recently accessed" pattern)
        courseResponses.sort((a, b) -> {
            String aTime = a.getLastAccessedAt();
            String bTime = b.getLastAccessedAt();
            if (aTime == null && bTime == null) return 0;
            if (aTime == null) return 1;
            if (bTime == null) return -1;
            return bTime.compareTo(aTime);
        });
        
        // Apply pagination manually (0-indexed, Spring Data standard)
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 100);
        int startIndex = safePage * safeSize;
        int endIndex = Math.min(startIndex + safeSize, courseResponses.size());
        List<EnrolledCourseResponse> pageContent = startIndex < courseResponses.size()
                ? courseResponses.subList(startIndex, endIndex)
                : Collections.emptyList();

        PageRequest pageable = PageRequest.of(safePage, safeSize);
        Page<EnrolledCourseResponse> pageResult = new PageImpl<>(pageContent, pageable, courseResponses.size());
        
        return ResponseEntity.ok(ApiResponse.success(pageResult, "Danh sách khóa học đã đăng ký"));
    }

    @Operation(summary = "Self-enroll in a course (SELF_PACED / Coursera-style)")
    @PostMapping("/courses/{courseId}/enroll")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> selfEnroll(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @PathVariable UUID courseId
    ) {
        if (currentUser == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Người dùng chưa xác thực"));
        }

        UUID enrollmentId = selfEnrollUseCase.execute(
                new SelfEnrollCommand(courseId, currentUser.getId())
        );

        
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("enrollmentId", enrollmentId.toString(), "courseId", courseId.toString()),
                "Đăng ký khóa học thành công"
        ));
    }

    @Operation(summary = "Get course progress for student")
    @GetMapping("/progress/courses/{courseId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<CourseProgressResponse>> getCourseProgress(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @PathVariable UUID courseId
    ) {
        if (currentUser == null) {
            return ResponseEntity.ok(ApiResponse.success(
                CourseProgressResponse.builder()
                    .courseId(courseId.toString())
                    .progressPercentage(0)
                    .status("not_authenticated")
                    .build(),
                "Xác thực người dùng không thành công"
            ));
        }

        UUID studentId = currentUser.getId();
        
        // SOTA: Single query to find enrollment by studentId + courseId
        // Replaces N+1 loop pattern with direct JOIN query
        Optional<Enrollment> enrollmentOpt = findAccessibleEnrollment(studentId, courseId);
        
        if (enrollmentOpt.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(
                CourseProgressResponse.builder()
                    .courseId(courseId.toString())
                    .progressPercentage(0)
                    .status("not_enrolled")
                    .build(),
                "Chưa đăng ký khóa học này"
            ));
        }
        
        Enrollment enrollment = enrollmentOpt.get();

        // Count total lessons (batch: 2 queries instead of N*C)
        long totalLessons = countTotalLessonsForCourse(courseId);

        CourseProgressResponse progress = CourseProgressResponse.builder()
                .courseId(courseId.toString())
                .progressPercentage(enrollment.getCompletionPercent() != null ? enrollment.getCompletionPercent() : 0)
                .status(enrollment.getStatus().name().toLowerCase())
                .completedLessons(enrollment.getProgress() != null
                    ? (int) enrollment.getProgress().values().stream().filter(p -> "COMPLETED".equals(p.getStatus())).count()
                    : 0)
                .totalLessons((int) totalLessons)
                .lastAccessedAt(enrollment.getLastAccessedAt() != null ? enrollment.getLastAccessedAt().toString() : null)
                .build();
        
        return ResponseEntity.ok(ApiResponse.success(progress, "Tiến độ khóa học"));
    }

    @Operation(summary = "Get completed lesson IDs for a course")
    @GetMapping("/progress/courses/{courseId}/completed-ids")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<String>>> getCompletedLessonIds(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @PathVariable UUID courseId
    ) {
        if (currentUser == null) {
            return ResponseEntity.ok(ApiResponse.success(List.of(), "Xác thực người dùng không thành công"));
        }

        UUID studentId = currentUser.getId();
        
        // SOTA: Single query to find enrollment by studentId + courseId
        Optional<Enrollment> enrollmentOpt = findAccessibleEnrollment(studentId, courseId);

        if (enrollmentOpt.isPresent()) {
            Enrollment enrollment = enrollmentOpt.get();
            // Return only lesson IDs with status=COMPLETED (not IN_PROGRESS/UNLOCKED)
            List<String> completedIds = enrollment.getProgress() != null
                ? enrollment.getProgress().entrySet().stream()
                    .filter(e -> "COMPLETED".equals(e.getValue().getStatus()))
                    .map(Map.Entry::getKey)
                    .toList()
                : List.of();
            return ResponseEntity.ok(ApiResponse.success(completedIds, "Danh sách bài học đã hoàn thành"));
        }

        // Not enrolled - return empty list
        return ResponseEntity.ok(ApiResponse.success(List.of(), "Chưa đăng ký khóa học này"));
    }

    @Operation(summary = "Mark lesson as completed")
    @PostMapping("/progress/lessons/{lessonId}/complete")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> markLessonComplete(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @PathVariable UUID lessonId
    ) {
        if (currentUser == null) {
            return ResponseEntity.status(401)
                .body(ApiResponse.error("Người dùng chưa xác thực"));
        }

        UUID studentId = currentUser.getId();

        // Find the specific enrollment whose course contains this lesson
        Optional<CourseJpaEntity> courseOpt = courseJpaRepository.findByLessonId(lessonId);
        if (courseOpt.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(
                Map.of("lessonId", lessonId.toString(), "status", "LESSON_NOT_FOUND"),
                "Không tìm thấy bài học trong khóa học nào"
            ));
        }

        UUID courseId = courseOpt.get().getId();
        Optional<Enrollment> enrollmentOpt = findAccessibleEnrollment(studentId, courseId);

        if (enrollmentOpt.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(
                Map.of("lessonId", lessonId.toString(), "status", "NOT_ENROLLED"),
                "Chưa đăng ký khóa học chứa bài học này"
            ));
        }

        Enrollment enrollment = enrollmentOpt.get();
        Enrollment savedEnrollment;
        try {
            applyLessonCompletion(enrollment, lessonId, courseId);
            savedEnrollment = saveLessonCompletionWithRetry(studentId, courseId, lessonId, enrollment);
        } catch (ObjectOptimisticLockingFailureException ex) {
            return ResponseEntity.status(409).body(ApiResponse.error(
                "Tiến độ bài học vừa được cập nhật ở phiên khác. Vui lòng thử lại để đồng bộ dữ liệu mới nhất."
            ));
        }

        // Auto-issue certificate when course reaches 100% completion
        if (savedEnrollment.getCompletionPercent() != null && savedEnrollment.getCompletionPercent() == 100) {
            try {
                certificateUseCase.issueIfNotExists(savedEnrollment.getId(), studentId, courseId);
            } catch (org.springframework.dao.DataAccessException | IllegalStateException e) {
                // Non-blocking: certificate issuance failure should not break lesson completion
            }
        }

        return ResponseEntity.ok(ApiResponse.success(
            Map.of(
                "lessonId", lessonId.toString(),
                "status", "COMPLETED",
                "completedAt", Instant.now().toString(),
                "completedSections", savedEnrollment.getProgress() != null
                    && savedEnrollment.getProgress().get(lessonId.toString()) != null
                    && savedEnrollment.getProgress().get(lessonId.toString()).getCompletedSections() != null
                    ? savedEnrollment.getProgress().get(lessonId.toString()).getCompletedSections()
                    : List.of()
            ),
            "Đã hoàn thành bài học"
        ));
    }

    @Operation(summary = "Mark section within a lesson as completed")
    @PostMapping("/progress/lessons/{lessonId}/sections/{sectionId}/complete")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> markSectionComplete(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @PathVariable UUID lessonId,
            @PathVariable String sectionId
    ) {
        if (currentUser == null) {
            return ResponseEntity.status(401)
                .body(ApiResponse.error("Người dùng chưa xác thực"));
        }

        UUID studentId = currentUser.getId();

        // Find course containing this lesson
        Optional<CourseJpaEntity> courseOpt = courseJpaRepository.findByLessonId(lessonId);
        if (courseOpt.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(
                Map.of("lessonId", lessonId.toString(), "status", "LESSON_NOT_FOUND"),
                "Không tìm thấy bài học trong khóa học nào"
            ));
        }

        UUID courseId = courseOpt.get().getId();
        Optional<Enrollment> enrollmentOpt = findAccessibleEnrollment(studentId, courseId);

        if (enrollmentOpt.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(
                Map.of("lessonId", lessonId.toString(), "status", "NOT_ENROLLED"),
                "Chưa đăng ký khóa học chứa bài học này"
            ));
        }

        Enrollment enrollment = enrollmentOpt.get();
        Enrollment.LessonProgress existingProgress = enrollment.getProgress() != null
                ? enrollment.getProgress().get(lessonId.toString())
                : null;
        String lessonIdStr = lessonId.toString();

        if (existingProgress != null
                && existingProgress.getCompletedSections() != null
                && existingProgress.getCompletedSections().contains(sectionId)) {
            return ResponseEntity.ok(ApiResponse.success(
                buildSectionCompletionResponse(lessonIdStr, sectionId, existingProgress),
                "Đã hoàn thành phần học"
            ));
        }

        final Enrollment savedEnrollment;
        try {
            applySectionCompletion(enrollment, lessonIdStr, sectionId);
            savedEnrollment = saveSectionCompletionWithRetry(studentId, courseId, lessonIdStr, sectionId, enrollment);
        } catch (ObjectOptimisticLockingFailureException ex) {
            return ResponseEntity.status(409).body(ApiResponse.error(
                "Tiến độ phần học vừa được cập nhật ở phiên khác. Vui lòng thử lại để đồng bộ dữ liệu mới nhất."
            ));
        }

        Enrollment.LessonProgress savedProgress = savedEnrollment.getProgress() != null
                ? savedEnrollment.getProgress().get(lessonIdStr)
                : null;

        return ResponseEntity.ok(ApiResponse.success(
            buildSectionCompletionResponse(lessonIdStr, sectionId, savedProgress),
            "Đã hoàn thành phần học"
        ));
        

        

        /* return ResponseEntity.ok(ApiResponse.success(
            Map.of(
                "lessonId", lessonIdStr,
                "sectionId", sectionId,
                "completedSections", lessonProgress.getCompletedSections() != null
                    ? lessonProgress.getCompletedSections() : List.of(),
                "status", "SECTION_COMPLETED"
            ),
            "Đã hoàn thành phần học"
        )); */
    }

    @Operation(summary = "Get lesson progress for student")
    @GetMapping("/lessons/{lessonId}/progress")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getLessonProgress(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @PathVariable UUID lessonId
    ) {
        if (currentUser == null) {
            return ResponseEntity.status(401)
                .body(ApiResponse.error("Người dùng chưa xác thực"));
        }

        UUID studentId = currentUser.getId();
        List<Enrollment> activeEnrollments = enrollmentRepository.findActiveWithClass(studentId);

        for (Enrollment enrollment : activeEnrollments) {
            Map<String, Enrollment.LessonProgress> progress = enrollment.getProgress();
            if (progress != null && progress.containsKey(lessonId.toString())) {
                Enrollment.LessonProgress lp = progress.get(lessonId.toString());
                return ResponseEntity.ok(ApiResponse.success(
                    Map.of(
                        "lessonId", lessonId.toString(),
                        "status", lp.getStatus() != null ? lp.getStatus() : "IN_PROGRESS",
                        "watchTimeSeconds", lp.getWatchSeconds() != null ? lp.getWatchSeconds() : 0,
                        "completionPercent", "COMPLETED".equals(lp.getStatus()) ? 100 : 0,
                        "completedSections", lp.getCompletedSections() != null ? lp.getCompletedSections() : List.of()
                    ),
                    "Tiến độ bài học"
                ));
            }
        }

        // No progress found - lesson not started
        return ResponseEntity.ok(ApiResponse.success(
            Map.of(
                "lessonId", lessonId.toString(),
                "status", "NOT_STARTED",
                "watchTimeSeconds", 0,
                "completionPercent", 0,
                "completedSections", List.of()
            ),
            "Bài học chưa bắt đầu"
        ));
    }

    @Operation(summary = "Get next lesson to learn for a course")
    @GetMapping("/progress/courses/{courseId}/next-lesson")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<String>> getNextLesson(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @PathVariable UUID courseId
    ) {
        if (currentUser == null) {
            return ResponseEntity.ok(ApiResponse.success(null, "Người dùng chưa xác thực"));
        }

        UUID studentId = currentUser.getId();
        
        // SOTA: Single query to find enrollment by studentId + courseId
        Optional<Enrollment> enrollmentOpt = findAccessibleEnrollment(studentId, courseId);

        if (enrollmentOpt.isPresent()) {
            Enrollment enrollment = enrollmentOpt.get();

            Set<String> completedIds = enrollment.getProgress() != null
                ? enrollment.getProgress().entrySet().stream()
                    .filter(e -> "COMPLETED".equals(e.getValue().getStatus()))
                    .map(Map.Entry::getKey)
                    .collect(Collectors.toSet())
                : Set.of();

            // Batch load all lessons ordered by chapter→lesson orderIndex (2 queries instead of N+1)
            List<ChapterJpaEntity> chapters = chapterJpaRepository.findByCourseIdOrderByOrderIndex(courseId);
            if (!chapters.isEmpty()) {
                List<UUID> chapterIds = chapters.stream().map(ChapterJpaEntity::getId).toList();
                List<LessonJpaEntity> allLessons = lessonJpaRepository.findByChapterIdIn(chapterIds);
                // Group by chapterId preserving lesson order
                Map<UUID, List<LessonJpaEntity>> lessonsByChapter = allLessons.stream()
                        .collect(Collectors.groupingBy(LessonJpaEntity::getChapterId));
                // Iterate in chapter order → lesson order
                for (ChapterJpaEntity chapter : chapters) {
                    List<LessonJpaEntity> lessons = lessonsByChapter.getOrDefault(chapter.getId(), List.of());
                    for (LessonJpaEntity lesson : lessons) {
                        if (!completedIds.contains(lesson.getId().toString())) {
                            return ResponseEntity.ok(ApiResponse.success(
                                    lesson.getId().toString(), "Bài học tiếp theo"));
                        }
                    }
                }
            }

            // All lessons completed
            return ResponseEntity.ok(ApiResponse.success(null, "Đã hoàn thành tất cả bài học"));
        }

        return ResponseEntity.ok(ApiResponse.success(null, "Chưa đăng ký"));
    }

    @Operation(summary = "Get student's certificates")
    @GetMapping("/certificates")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getStudentCertificates(
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Người dùng chưa xác thực"));
        }

        var certs = certificateRepository.findByStudentIdOrderByIssuedAtDesc(currentUser.getId());
        // Batch load course names (1 query instead of N)
        Set<UUID> courseIds = certs.stream().map(c -> c.getCourseId()).collect(Collectors.toSet());
        Map<UUID, String> courseNameMap = courseJpaRepository.findAllById(courseIds).stream()
                .collect(Collectors.toMap(CourseJpaEntity::getId, CourseJpaEntity::getTitle));

        List<Map<String, Object>> result = certs.stream().map(c -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", c.getId().toString());
            map.put("courseId", c.getCourseId().toString());
            map.put("courseName", courseNameMap.getOrDefault(c.getCourseId(), ""));
            map.put("verificationToken", c.getVerificationToken().toString());
            map.put("issuedAt", c.getIssuedAt().toString());
            return (Map<String, Object>) map;
        }).toList();

        return ResponseEntity.ok(ApiResponse.success(result, "Danh sách chứng chỉ"));
    }

    @Operation(summary = "Issue certificate for completed course")
    @PostMapping("/certificates/issue/{enrollmentId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> issueCertificate(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @PathVariable UUID enrollmentId) {
        if (currentUser == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Người dùng chưa xác thực"));
        }

        // Check enrollment exists and belongs to student
        Optional<Enrollment> enrollmentOpt = enrollmentRepository.findActiveWithClass(currentUser.getId()).stream()
                .filter(e -> e.getId().equals(enrollmentId))
                .findFirst();

        if (enrollmentOpt.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.error("Không tìm thấy đăng ký khóa học"));
        }

        Enrollment enrollment = enrollmentOpt.get();

        // Check if certificate already exists
        if (certificateRepository.existsByEnrollmentId(enrollmentId)) {
            var existing = certificateRepository.findByEnrollmentId(enrollmentId).get();
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("id", existing.getId().toString());
            result.put("verificationToken", existing.getVerificationToken().toString());
            result.put("issuedAt", existing.getIssuedAt().toString());
            result.put("alreadyExists", true);
            return ResponseEntity.ok(ApiResponse.success(result, "Chứng chỉ đã được cấp"));
        }

        // Check course completion (must be fully complete before certificate)
        int progress = enrollment.getCompletionPercent() != null ? enrollment.getCompletionPercent() : 0;
        if (progress < 100) {
            return ResponseEntity.ok(ApiResponse.error("Khóa học phải hoàn thành 100% trước khi cấp chứng chỉ"));
        }

        UUID courseId = enrollment.getLearningClass() != null ? enrollment.getLearningClass().getCourseId() : null;
        if (courseId == null) {
            return ResponseEntity.ok(ApiResponse.error("Không tìm thấy khóa học cho đăng ký này"));
        }

        final com.example.lms.learning_delivery.domain.model.Certificate saved;
        try {
            saved = certificateUseCase.issueIfNotExists(enrollmentId, currentUser.getId(), courseId);
        } catch (IllegalStateException e) {
            return ResponseEntity.ok(ApiResponse.error(e.getMessage()));
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", saved.getId().toString());
        result.put("verificationToken", saved.getVerificationToken().toString());
        result.put("issuedAt", saved.getIssuedAt().toString());
        result.put("courseId", courseId.toString());
        return ResponseEntity.ok(ApiResponse.success(result, "Cấp chứng chỉ thành công"));
    }

    @Operation(summary = "Verify a certificate (public endpoint)")
    @GetMapping("/certificates/{token}/verify")
    public ResponseEntity<ApiResponse<Map<String, Object>>> verifyCertificate(
            @PathVariable UUID token) {
        return certificateRepository.findByVerificationToken(token)
                .map(cert -> {
                    Map<String, Object> result = new LinkedHashMap<>();
                    result.put("valid", true);
                    result.put("studentId", cert.getStudentId().toString());
                    result.put("studentName", userJpaRepository.findById(cert.getStudentId())
                            .map(UserJpaEntity::getFullName).orElse(""));
                    result.put("courseId", cert.getCourseId().toString());
                    result.put("courseName", courseJpaRepository.findById(cert.getCourseId())
                            .map(CourseJpaEntity::getTitle).orElse(""));
                    result.put("issuedAt", cert.getIssuedAt().toString());
                    return ResponseEntity.ok(ApiResponse.success(result, "Chứng chỉ hợp lệ"));
                })
                .orElse(ResponseEntity.ok(ApiResponse.success(
                        Map.of("valid", (Object) false), "Không tìm thấy chứng chỉ")));
    }

    @Operation(summary = "Get student grades across all courses")
    @GetMapping("/grades")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getStudentGrades(
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Người dùng chưa xác thực"));
        }

        UUID studentId = currentUser.getId();
        List<Map<String, Object>> grades = new ArrayList<>();

        // Get all active + completed enrollments (enrollment-centric grades — Canvas pattern)
        List<Enrollment> enrollments = enrollmentRepository.findActiveAndCompletedWithClass(studentId);
        List<Enrollment> validEnrollments = enrollments.stream()
                .filter(e -> e.getLearningClass() != null)
                .toList();

        if (validEnrollments.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(grades, "Bảng điểm học viên"));
        }

        // Batch load all data (SOTA: N+1 elimination)
        List<UUID> courseIds = validEnrollments.stream()
                .map(e -> e.getLearningClass().getCourseId()).distinct().toList();

        // 1. Batch courses
        Map<UUID, CourseJpaEntity> courseMap = courseJpaRepository.findAllById(courseIds).stream()
                .collect(Collectors.toMap(CourseJpaEntity::getId, c -> c));

        // 2. Batch chapters → lessons → quizzes (3 queries total)
        List<ChapterJpaEntity> allChapters = chapterJpaRepository.findByCourseIdInOrderByOrderIndex(courseIds);
        List<UUID> chapterIds = allChapters.stream().map(ChapterJpaEntity::getId).toList();
        Map<UUID, UUID> chapterToCourse = allChapters.stream()
                .collect(Collectors.toMap(ChapterJpaEntity::getId, ChapterJpaEntity::getCourseId));

        List<LessonJpaEntity> allLessons = chapterIds.isEmpty()
                ? List.of() : lessonJpaRepository.findByChapterIdIn(chapterIds);
        // Map lessonId → courseId
        Map<UUID, UUID> lessonToCourse = new HashMap<>();
        for (LessonJpaEntity lesson : allLessons) {
            UUID cId = chapterToCourse.get(lesson.getChapterId());
            if (cId != null) lessonToCourse.put(lesson.getId(), cId);
        }

        List<UUID> allLessonIds = allLessons.stream().map(LessonJpaEntity::getId).toList();
        List<QuizJpaEntity> allQuizzes = allLessonIds.isEmpty()
                ? List.of() : quizJpaRepository.findByLessonIdIn(allLessonIds);

        // 3. Batch quiz attempts (1 query)
        List<UUID> allQuizIds = allQuizzes.stream().map(QuizJpaEntity::getId).toList();
        List<QuizAttemptJpaEntity> allAttempts = allQuizIds.isEmpty()
                ? List.of() : quizAttemptJpaRepository.findByQuizIdInAndStudentId(allQuizIds, studentId);
        Map<UUID, List<QuizAttemptJpaEntity>> attemptsByQuiz = allAttempts.stream()
                .collect(Collectors.groupingBy(QuizAttemptJpaEntity::getQuizId));

        // Map quizzes by courseId
        Map<UUID, List<QuizJpaEntity>> quizzesByCourse = new HashMap<>();
        for (QuizJpaEntity quiz : allQuizzes) {
            UUID cId = lessonToCourse.get(quiz.getLessonId());
            if (cId != null) quizzesByCourse.computeIfAbsent(cId, k -> new ArrayList<>()).add(quiz);
        }

        // 4. Batch assignments + submissions (2 queries)
        List<AssignmentJpaEntity> allAssignments = assignmentJpaRepository
                .findByCourseIdInAndStatus(courseIds, AssignmentJpaEntity.AssignmentStatus.PUBLISHED);
        Map<UUID, List<AssignmentJpaEntity>> assignmentsByCourse = allAssignments.stream()
                .collect(Collectors.groupingBy(AssignmentJpaEntity::getCourseId));

        List<UUID> allAssignmentIds = allAssignments.stream().map(AssignmentJpaEntity::getId).toList();
        Map<UUID, AssignmentSubmissionJpaEntity> submissionByAssignment = allAssignmentIds.isEmpty()
                ? Map.of()
                : submissionJpaRepository.findByAssignmentIdInAndStudentId(allAssignmentIds, studentId).stream()
                        .collect(Collectors.toMap(AssignmentSubmissionJpaEntity::getAssignmentId, s -> s, (a, b) -> a));

        // 5. Batch certificate check (1 query instead of N)
        List<UUID> enrollmentIds = validEnrollments.stream().map(Enrollment::getId).toList();
        Set<UUID> enrollmentsWithCerts = enrollmentIds.isEmpty()
                ? Set.of()
                : certificateRepository.findEnrollmentIdsWithCertificates(enrollmentIds);

        // 6. Build enrollment-centric grade response (Canvas pattern: 1 enrollment = 1 entry)
        for (Enrollment enrollment : validEnrollments) {
            UUID courseId = enrollment.getLearningClass().getCourseId();
            CourseJpaEntity course = courseMap.get(courseId);
            if (course == null) continue;
            var lc = enrollment.getLearningClass();

            Map<String, Object> gradeEntry = new LinkedHashMap<>();
            // Enrollment fields
            gradeEntry.put("enrollmentId", enrollment.getId().toString());
            gradeEntry.put("enrollmentStatus", enrollment.getStatus().name());
            gradeEntry.put("enrolledAt", enrollment.getEnrolledAt() != null ? enrollment.getEnrolledAt().toString() : null);
            // Course fields
            gradeEntry.put("courseId", courseId.toString());
            gradeEntry.put("courseTitle", course.getTitle());
            gradeEntry.put("courseCode", course.getCode());
            gradeEntry.put("deliveryMode", course.getDeliveryMode().name());
            gradeEntry.put("thumbnailUrl", course.getThumbnailUrl());
            // Class fields
            gradeEntry.put("classId", lc.getId().toString());
            gradeEntry.put("className", lc.getName());
            gradeEntry.put("classCode", lc.getCode());
            gradeEntry.put("semester", lc.getSemester());
            // Progress
            gradeEntry.put("progress", enrollment.getCompletionPercent() != null ? enrollment.getCompletionPercent() : 0);
            // Keep legacy "status" for backward compatibility
            gradeEntry.put("status", enrollment.getStatus().name());

            // Quiz scores from pre-loaded data
            List<Map<String, Object>> quizScores = new ArrayList<>();
            for (QuizJpaEntity quiz : quizzesByCourse.getOrDefault(courseId, List.of())) {
                List<QuizAttemptJpaEntity> attempts = attemptsByQuiz.getOrDefault(quiz.getId(), List.of());
                var bestAttempt = attempts.stream()
                        .filter(a -> a.getScore() != null)
                        .max(java.util.Comparator.comparingDouble(QuizAttemptJpaEntity::getScore))
                        .orElse(null);
                if (bestAttempt != null) {
                    Map<String, Object> qs = new LinkedHashMap<>();
                    qs.put("quizId", quiz.getId().toString());
                    qs.put("quizTitle", quiz.getTitle());
                    qs.put("bestScore", bestAttempt.getScore());
                    qs.put("maxScore", bestAttempt.getMaxScore() != null ? bestAttempt.getMaxScore() : 10);
                    qs.put("isPassed", bestAttempt.getIsPassed());
                    qs.put("bestAttemptId", bestAttempt.getId().toString());
                    qs.put("attempts", attempts.size());
                    quizScores.add(qs);
                }
            }
            gradeEntry.put("quizScores", quizScores);

            // Assignment scores from pre-loaded data
            List<Map<String, Object>> assignmentScores = new ArrayList<>();
            for (AssignmentJpaEntity assignment : assignmentsByCourse.getOrDefault(courseId, List.of())) {
                AssignmentSubmissionJpaEntity sub = submissionByAssignment.get(assignment.getId());
                if (sub != null) {
                    Map<String, Object> as = new LinkedHashMap<>();
                    as.put("assignmentId", assignment.getId().toString());
                    as.put("assignmentTitle", assignment.getTitle());
                    as.put("grade", sub.getGrade());
                    as.put("maxScore", assignment.getMaxScore());
                    as.put("status", sub.getStatus().name());
                    assignmentScores.add(as);
                }
            }
            gradeEntry.put("assignmentScores", assignmentScores);

            // Certificate status (batch pre-loaded — no N+1)
            gradeEntry.put("hasCertificate", enrollmentsWithCerts.contains(enrollment.getId()));

            grades.add(gradeEntry);
        }

        return ResponseEntity.ok(ApiResponse.success(grades, "Bảng điểm học viên"));
    }

    // NOTE: Student Assignment endpoints moved to StudentAssignmentControllerV3
    // in assessment module (Canvas-style typed DTOs, submit + submission endpoints)

    @Operation(summary = "Recalculate all enrollment progress for current user")
    @PostMapping("/progress/recalculate")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> recalculateProgress(
            @AuthenticationPrincipal UserJpaEntity currentUser
    ) {
        if (currentUser == null) {
            return ResponseEntity.status(401)
                .body(ApiResponse.error("Người dùng chưa xác thực"));
        }

        UUID studentId = currentUser.getId();
        List<Enrollment> enrollments = enrollmentRepository.findActiveAndCompletedWithClass(studentId);
        
        int updatedCount = 0;
        for (Enrollment enrollment : enrollments) {
            if (enrollment.getLearningClass() == null) continue;
            
            UUID courseId = enrollment.getLearningClass().getCourseId();
            if (courseId == null) continue;
            
            long totalLessons = countTotalLessonsForCourse(courseId);
            if (totalLessons > 0 && enrollment.getProgress() != null) {
                long completedCount = enrollment.getProgress().values().stream()
                    .filter(p -> "COMPLETED".equals(p.getStatus()))
                    .count();
                int percent = (int) Math.min(100, Math.round((double) completedCount / totalLessons * 100));
                
                if (enrollment.getCompletionPercent() == null || enrollment.getCompletionPercent() != percent) {
                    enrollment.updateCompletionPercent(percent);
                    enrollmentRepository.save(enrollment);
                    updatedCount++;
                }
            }
        }

        return ResponseEntity.ok(ApiResponse.success(
            Map.of("updatedCount", updatedCount),
            "Đã tính lại tiến độ cho " + updatedCount + " khóa học"
        ));
    }

    // Response DTOs
    @lombok.Builder
    @lombok.Data
    public static class EnrolledCourseResponse {
        private String id;
        private String title;
        private String description;
        private String teacherName;
        private String categoryName;
        private String thumbnailUrl;
        private String status;
        private Integer progress;
        private Integer totalLessons;
        private Integer completedLessons;
        private String enrolledAt;
        private String lastAccessedAt;
        private String createdAt;
        // Payment & offline download fields
        private String priceType;
        private boolean allowOfflineDownload;
        private boolean isPaid;
        private String deliveryMode;
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

    /**
     * Count total lessons for a course in 2 queries (chapters + lessons batch).
     * Replaces N*C pattern: chapters.stream().mapToLong(ch -> countByChapterId(ch.getId())).
     */
private void applyLessonCompletion(Enrollment enrollment, UUID lessonId, UUID courseId) {
    enrollment.updateProgress(lessonId.toString(), buildCompletedLessonProgress(enrollment, lessonId));
    recalculateEnrollmentCompletionPercent(enrollment, courseId);
}

private void applySectionCompletion(Enrollment enrollment, String lessonId, String sectionId) {
    Enrollment.LessonProgress existingProgress = enrollment.getProgress() != null
            ? enrollment.getProgress().get(lessonId)
            : null;

    Set<String> completedSections = new LinkedHashSet<>();
    if (existingProgress != null && existingProgress.getCompletedSections() != null) {
        completedSections.addAll(existingProgress.getCompletedSections());
    }
    completedSections.add(sectionId);

    enrollment.updateProgress(lessonId, Enrollment.LessonProgress.builder()
            .status(existingProgress != null && existingProgress.getStatus() != null
                    ? existingProgress.getStatus()
                    : "IN_PROGRESS")
            .watchSeconds(existingProgress != null ? existingProgress.getWatchSeconds() : null)
            .grade(existingProgress != null ? existingProgress.getGrade() : null)
            .lastActivity(Instant.now())
            .completedSections(new ArrayList<>(completedSections))
            .build());
}

private Enrollment saveLessonCompletionWithRetry(UUID studentId, UUID courseId, UUID lessonId, Enrollment enrollment) {
    try {
        return enrollmentRepository.save(enrollment);
        } catch (ObjectOptimisticLockingFailureException ex) {
            Optional<Enrollment> latestEnrollment = findAccessibleEnrollment(studentId, courseId);
            if (latestEnrollment.isEmpty()) {
                throw ex;
            }

            Enrollment retryEnrollment = latestEnrollment.get();
        applyLessonCompletion(retryEnrollment, lessonId, courseId);
        return enrollmentRepository.save(retryEnrollment);
    }
}

private Enrollment saveSectionCompletionWithRetry(
        UUID studentId,
        UUID courseId,
        String lessonId,
        String sectionId,
        Enrollment enrollment
) {
    try {
        return enrollmentRepository.save(enrollment);
    } catch (ObjectOptimisticLockingFailureException ex) {
        Optional<Enrollment> latestEnrollment = findAccessibleEnrollment(studentId, courseId);
        if (latestEnrollment.isEmpty()) {
            throw ex;
        }

        Enrollment retryEnrollment = latestEnrollment.get();
        Enrollment.LessonProgress latestProgress = retryEnrollment.getProgress() != null
                ? retryEnrollment.getProgress().get(lessonId)
                : null;
        if (latestProgress != null
                && latestProgress.getCompletedSections() != null
                && latestProgress.getCompletedSections().contains(sectionId)) {
            return retryEnrollment;
        }

        applySectionCompletion(retryEnrollment, lessonId, sectionId);
        try {
            return enrollmentRepository.save(retryEnrollment);
        } catch (ObjectOptimisticLockingFailureException retryEx) {
            Optional<Enrollment> convergedEnrollment = findAccessibleEnrollment(studentId, courseId);
            if (convergedEnrollment.isPresent()) {
                Enrollment latestConverged = convergedEnrollment.get();
                Enrollment.LessonProgress convergedProgress = latestConverged.getProgress() != null
                        ? latestConverged.getProgress().get(lessonId)
                        : null;
                if (convergedProgress != null
                        && convergedProgress.getCompletedSections() != null
                        && convergedProgress.getCompletedSections().contains(sectionId)) {
                    return latestConverged;
                }
            }
            throw retryEx;
        }
    }
}

private Enrollment.LessonProgress buildCompletedLessonProgress(Enrollment enrollment, UUID lessonId) {
        Enrollment.LessonProgress existingProgress = enrollment.getProgress() != null
                ? enrollment.getProgress().get(lessonId.toString())
                : null;
        Set<String> completedSections = new LinkedHashSet<>();
        if (existingProgress != null && existingProgress.getCompletedSections() != null) {
            completedSections.addAll(existingProgress.getCompletedSections());
        }
        completedSections.addAll(resolveLessonSectionIds(lessonId));

        return Enrollment.LessonProgress.builder()
                .status("COMPLETED")
                .watchSeconds(existingProgress != null ? existingProgress.getWatchSeconds() : null)
                .grade(existingProgress != null ? existingProgress.getGrade() : null)
                .lastActivity(Instant.now())
            .completedSections(new ArrayList<>(completedSections))
            .build();
}

private Map<String, Object> buildSectionCompletionResponse(
        String lessonId,
        String sectionId,
        Enrollment.LessonProgress lessonProgress
) {
    return Map.of(
            "lessonId", lessonId,
            "sectionId", sectionId,
            "completedSections", lessonProgress != null && lessonProgress.getCompletedSections() != null
                    ? lessonProgress.getCompletedSections()
                    : List.of(),
            "status", "SECTION_COMPLETED"
    );
}

    private List<String> resolveLessonSectionIds(UUID lessonId) {
        return lessonJpaRepository.findById(lessonId)
                .map(lesson -> lesson.getContentBlocks() == null ? List.<String>of() : lesson.getContentBlocks().stream()
                        .map(com.example.lms.shared.domain.model.ContentBlock::getId)
                        .filter(Objects::nonNull)
                        .filter(sectionId -> !sectionId.isBlank())
                        .toList())
                .orElse(List.of());
    }

    private void recalculateEnrollmentCompletionPercent(Enrollment enrollment, UUID courseId) {
        long totalLessons = countTotalLessonsForCourse(courseId);
        if (totalLessons <= 0 || enrollment.getProgress() == null) {
            return;
        }

        long completedCount = enrollment.getProgress().values().stream()
                .filter(progress -> "COMPLETED".equals(progress.getStatus()))
                .count();
        int percent = (int) Math.min(100, Math.round((double) completedCount / totalLessons * 100));
        enrollment.updateCompletionPercent(percent);
    }

    private long countTotalLessonsForCourse(UUID courseId) {
        List<ChapterJpaEntity> chapters = chapterJpaRepository.findByCourseIdOrderByOrderIndex(courseId);
        if (chapters.isEmpty()) return 0;
        List<UUID> chapterIds = chapters.stream().map(ChapterJpaEntity::getId).toList();
        return lessonJpaRepository.findByChapterIdIn(chapterIds).size();
    }

    private Optional<Enrollment> findAccessibleEnrollment(UUID studentId, UUID courseId) {
        return enrollmentRepository.findByStudentIdAndCourseId(studentId, courseId)
                .filter(this::isAccessibleEnrollment);
    }

    private boolean isAccessibleEnrollment(Enrollment enrollment) {
        return enrollment.getStatus() == Enrollment.EnrollmentStatus.ACTIVE
                || enrollment.getStatus() == Enrollment.EnrollmentStatus.COMPLETED;
    }
}

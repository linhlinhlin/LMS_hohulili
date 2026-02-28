package com.example.lms.course_authoring.infrastructure.web;

import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.LessonJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.EnrollmentRepositoryImpl;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CategoryJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.shared.infrastructure.persistence.entity.PaymentTransactionJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.PaymentTransactionJpaRepository;

/**
 * V3 Controller for Course queries.
 * Provides read-only endpoints for listing and viewing courses.
 */
@Slf4j
@Tag(name = "Course Query V3", description = "Course query endpoints")
@RestController
@RequestMapping("/api/v3/courses")
@RequiredArgsConstructor
public class CourseQueryControllerV3 {

    private final CourseRepository courseRepository;
    private final LessonJpaRepository lessonRepository;
    private final LearningClassRepository learningClassRepository;
    private final EnrollmentRepositoryImpl enrollmentRepository;
    private final com.example.lms.course_authoring.infrastructure.persistence.repository.ChapterJpaRepository chapterRepository;
    private final UserJpaRepository userJpaRepository;
    private final com.example.lms.course_authoring.infrastructure.persistence.repository.CategoryJpaRepository categoryJpaRepository;
    private final PaymentTransactionJpaRepository paymentRepository;

    @Operation(summary = "Get all published courses")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<CourseSummaryResponse>>> getPublicCourses(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search
    ) {
        PageRequest pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100), Sort.by("createdAt").descending());
        
        Page<Course> courses;
        if (search != null && !search.isBlank()) {
            courses = courseRepository.findByStatusAndTitleContaining(Course.CourseStatus.APPROVED, search, pageable);
        } else {
            courses = courseRepository.findByStatus(Course.CourseStatus.APPROVED, pageable);
        }
        
        // Batch-fetch teacher names and category names to prevent N+1
        Set<UUID> teacherIds = courses.getContent().stream()
                .map(Course::getTeacherId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<UUID, String> teacherNameMap = teacherIds.isEmpty() ? Map.of() :
                userJpaRepository.findAllById(teacherIds).stream()
                        .collect(Collectors.toMap(u -> u.getId(), u -> u.getFullName()));

        Set<UUID> categoryIds = courses.getContent().stream()
                .map(Course::getCategoryId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<UUID, String> categoryNameMap = categoryIds.isEmpty() ? Map.of() :
                categoryJpaRepository.findAllById(categoryIds).stream()
                        .collect(Collectors.toMap(c -> c.getId(), c -> c.getName()));

        Page<CourseSummaryResponse> response = courses.map(course -> toSummaryBatch(course, teacherNameMap, categoryNameMap));
        return ResponseEntity.ok(ApiResponse.success(response, "Danh sách khóa học"));
    }

    // my-courses moved to TeacherCourseControllerV3

    @Operation(summary = "Get course details by ID")
    @GetMapping("/{courseId}")
    public ResponseEntity<ApiResponse<CourseDetailResponse>> getCourseById(
            @PathVariable UUID courseId
    ) {
        // FIX: Use findByIdWithContent to eagerly load chapters via JOIN FETCH
        // This prevents LazyInitializationException when open-in-view=false
        return courseRepository.findByIdWithContent(courseId)
                .map(course -> ResponseEntity.ok(ApiResponse.success(toDetail(course), "Thông tin khóa học")))
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Khóa học", courseId));
    }

    @Operation(summary = "Get course content (chapters and lessons)")
    @GetMapping("/{courseId}/content")
    public ResponseEntity<ApiResponse<List<ChapterResponse>>> getCourseContent(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal UserJpaEntity currentUser
    ) {
        // Query chapters and lessons directly from JPA repositories
        // (CourseEntityMapper.toDomain() doesn't load chapters - they're separate entities)
        var chapterEntities = chapterRepository.findByCourseIdOrderByOrderIndex(courseId);

        if (chapterEntities.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(new ArrayList<>(), "Khóa học chưa có nội dung"));
        }

        // Paywall check: determine if content should be gated
        boolean contentUnlocked = isContentUnlocked(courseId, currentUser);

        List<ChapterResponse> chapters = new ArrayList<>();
        for (var ch : chapterEntities) {
            var lessonEntities = lessonRepository.findByChapterIdOrderByOrderIndex(ch.getId());

            List<LessonResponse> lessonResponses = new ArrayList<>();
            for (var l : lessonEntities) {
                boolean lessonFree = l.getIsFree() != null && l.getIsFree();
                boolean showContent = contentUnlocked || lessonFree;

                List<SectionResponse> sectionResponses = new ArrayList<>();
                if (l.getContentBlocks() != null) {
                    for (var block : l.getContentBlocks()) {
                        java.util.Map<String, Object> data = block.getData() != null ? block.getData() : new java.util.HashMap<>();
                        sectionResponses.add(SectionResponse.builder()
                            .id(block.getId())
                            .title((String) data.getOrDefault("title", "Untitled"))
                            .type(block.getType())
                            .content(showContent ? (String) data.get("content") : null)
                            .videoUrl(showContent ? (String) data.get("videoUrl") : null)
                            .fileUrl(showContent ? (String) data.get("fileUrl") : null)
                            .duration(data.get("duration") != null ? ((Number) data.get("duration")).intValue() : 0)
                            .orderIndex(data.get("orderIndex") != null ? ((Number) data.get("orderIndex")).intValue() : 0)
                            .isRequired(data.get("isRequired") != null ? (Boolean) data.get("isRequired") : false)
                            .build());
                    }
                }

                lessonResponses.add(LessonResponse.builder()
                        .id(l.getId().toString())
                        .title(l.getTitle())
                        .description(l.getDescription())
                        .type(l.getType() != null ? l.getType().name() : "LECTURE")
                        .durationMinutes(l.getDurationMinutes())
                        .orderIndex(l.getOrderIndex())
                        .isFree(lessonFree)
                        .locked(!showContent)
                        .sections(sectionResponses)
                        .build());
            }

            chapters.add(ChapterResponse.builder()
                    .id(ch.getId().toString())
                    .title(ch.getTitle())
                    .description(ch.getDescription())
                    .orderIndex(ch.getOrderIndex())
                    .lessons(lessonResponses)
                    .build());
        }

        return ResponseEntity.ok(ApiResponse.success(chapters, "Nội dung khóa học"));
    }

    @Operation(summary = "Get instructors for a course")
    @GetMapping("/{courseId}/instructors")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<List<InstructorResponse>>> getCourseInstructors(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        verifyCourseOwnership(courseId, user);
        // Return course owner/teacher as instructor with real user data
        return courseRepository.findById(courseId)
                .map(course -> {
                    var teacherOpt = userJpaRepository.findById(course.getTeacherId());
                    String teacherName = teacherOpt.map(u -> u.getFullName()).orElse("Unknown");
                    String teacherEmail = teacherOpt.map(u -> u.getEmail()).orElse("");

                    InstructorResponse instructor = InstructorResponse.builder()
                            .id(course.getTeacherId().toString())
                            .userId(course.getTeacherId().toString())
                            .userName(teacherName)
                            .userEmail(teacherEmail)
                            .role("OWNER")
                            .status("ACTIVE")
                            .canManage(true)
                            .canViewPerformance(true)
                            .isVisible(true)
                            .canGradeAssignments(true)
                            .revenueSharePercent(100)
                            .invitedAt(course.getCreatedAt() != null ? course.getCreatedAt().toString() : null)
                            .build();
                    return ResponseEntity.ok(ApiResponse.success(List.of(instructor), "Danh sách giảng viên"));
                })
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Khóa học", courseId));
    }

    @lombok.Builder
    @lombok.Data
    public static class InstructorResponse {
        private String id;
        private String userId;
        private String userName;
        private String userEmail;
        private String role;
        private String status;
        private boolean canManage;
        private boolean canViewPerformance;
        private boolean isVisible;
        private boolean canGradeAssignments;
        private int revenueSharePercent;
        private String invitedAt;
        private String acceptedAt;
    }



    @Operation(summary = "Get classes for a course")
    @GetMapping("/{courseId}/classes")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<List<ClassInfoResponse>>> getCourseClasses(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        verifyCourseOwnership(courseId, user);
        List<LearningClass> classes = learningClassRepository.findByCourseId(courseId);
        List<ClassInfoResponse> response = batchMapClasses(classes);
        return ResponseEntity.ok(ApiResponse.success(response, "Danh sách lớp học"));
    }

    @Operation(summary = "Search classes for a course")
    @GetMapping("/{courseId}/classes/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Page<ClassInfoResponse>>> searchCourseClasses(
            @PathVariable UUID courseId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String semester,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        verifyCourseOwnership(courseId, user);
        PageRequest pageable = PageRequest.of(page, Math.min(size, 100));
        Page<LearningClass> classPage = learningClassRepository.searchByCourseId(courseId, search, status, pageable);
        // Batch-fetch teacher names and enrollment counts to prevent N+1
        List<LearningClass> classList = classPage.getContent();
        Map<UUID, String> teacherMap = batchFetchTeacherNames(classList);
        Map<UUID, Long> enrollmentCountMap = batchFetchClassEnrollments(classList);
        Page<ClassInfoResponse> response = classPage.map(lc -> toClassInfoResponseBatch(lc, teacherMap, enrollmentCountMap));
        return ResponseEntity.ok(ApiResponse.success(response, "Tìm kiếm lớp học"));
    }

    private List<ClassInfoResponse> batchMapClasses(List<LearningClass> classes) {
        Map<UUID, String> teacherMap = batchFetchTeacherNames(classes);
        Map<UUID, Long> enrollmentCountMap = batchFetchClassEnrollments(classes);
        return classes.stream()
                .map(lc -> toClassInfoResponseBatch(lc, teacherMap, enrollmentCountMap))
                .toList();
    }

    private Map<UUID, String> batchFetchTeacherNames(List<LearningClass> classes) {
        Set<UUID> teacherIds = classes.stream()
                .map(LearningClass::getTeacherId).filter(Objects::nonNull).collect(Collectors.toSet());
        if (teacherIds.isEmpty()) return Map.of();
        return userJpaRepository.findAllById(teacherIds).stream()
                .collect(Collectors.toMap(u -> u.getId(), u -> u.getFullName()));
    }

    private Map<UUID, Long> batchFetchClassEnrollments(List<LearningClass> classes) {
        List<UUID> classIds = classes.stream().map(LearningClass::getId).toList();
        if (classIds.isEmpty()) return Map.of();
        Map<UUID, Long> result = new HashMap<>();
        // Use individual counts since batch may not exist — still better than N+1 in toClassInfoResponse
        for (UUID classId : classIds) {
            result.put(classId, enrollmentRepository.countByClassId(classId));
        }
        return result;
    }

    private ClassInfoResponse toClassInfoResponseBatch(LearningClass lc, Map<UUID, String> teacherMap, Map<UUID, Long> enrollmentCountMap) {
        String teacherName = lc.getTeacherId() != null ? teacherMap.getOrDefault(lc.getTeacherId(), "Unknown Teacher") : null;
        long studentCount = enrollmentCountMap.getOrDefault(lc.getId(), 0L);
        return ClassInfoResponse.builder()
                .id(lc.getId().toString())
                .name(lc.getName())
                .code(lc.getCode())
                .status(lc.getStatus() != null ? lc.getStatus().name() : "OPEN")
                .teacherName(teacherName)
                .studentCount((int) studentCount)
                .startDate(lc.getStartDate() != null ? lc.getStartDate().toString() : null)
                .endDate(lc.getEndDate() != null ? lc.getEndDate().toString() : null)
                .build();
    }

    @lombok.Builder
    @lombok.Data
    public static class ClassInfoResponse {
        private String id;
        private String name;
        private String code;
        private String status;
        private String teacherName; // Added field
        private Integer studentCount;
        private String startDate;
        private String endDate;
    }

    @Operation(summary = "Get lesson details by ID")
    @GetMapping("/lessons/{lessonId}")
    public ResponseEntity<ApiResponse<LessonDetailResponse>> getLessonById(
            @PathVariable UUID lessonId,
            @AuthenticationPrincipal UserJpaEntity currentUser
    ) {
        // Query chain: Lesson -> Chapter -> Course (3 indexed queries, no nested loops)
        return lessonRepository.findById(lessonId)
                .flatMap(lesson -> chapterRepository.findById(lesson.getChapterId())
                        .flatMap(chapter -> courseRepository.findById(chapter.getCourseId())
                                .map(course -> {
                                    // Paywall check (use Course overload to avoid redundant fetch)
                                    boolean lessonFree = lesson.getIsFree() != null && lesson.getIsFree();
                                    boolean showContent = isContentUnlocked(course, currentUser) || lessonFree;

                                    // Build sections from contentBlocks
                                    List<SectionResponse> sectionResponses = new ArrayList<>();
                                    String contentText = null;
                                    if (lesson.getContentBlocks() != null) {
                                        for (var block : lesson.getContentBlocks()) {
                                            Map<String, Object> data = block.getData() != null ? block.getData() : new HashMap<>();
                                            sectionResponses.add(SectionResponse.builder()
                                                .id(block.getId())
                                                .title((String) data.getOrDefault("title", "Untitled"))
                                                .type(block.getType())
                                                .content(showContent ? (String) data.get("content") : null)
                                                .videoUrl(showContent ? (String) data.get("videoUrl") : null)
                                                .fileUrl(showContent ? (String) data.get("fileUrl") : null)
                                                .duration(data.get("duration") != null ? ((Number) data.get("duration")).intValue() : 0)
                                                .orderIndex(data.get("orderIndex") != null ? ((Number) data.get("orderIndex")).intValue() : 0)
                                                .isRequired(data.get("isRequired") != null ? (Boolean) data.get("isRequired") : false)
                                                .build());
                                        }
                                        if (showContent) {
                                            // Populate content from first TEXT block as fallback
                                            contentText = lesson.getContentBlocks().stream()
                                                .filter(b -> "TEXT".equals(b.getType()) && b.getData() != null)
                                                .map(b -> (String) b.getData().get("content"))
                                                .findFirst().orElse(null);
                                        }
                                    }

                                    LessonDetailResponse response = LessonDetailResponse.builder()
                                            .id(lesson.getId().toString())
                                            .title(lesson.getTitle())
                                            .description(lesson.getDescription())
                                            .lessonType(lesson.getType() != null ? lesson.getType().name() : "LECTURE")
                                            .durationMinutes(lesson.getDurationMinutes())
                                            .orderIndex(lesson.getOrderIndex())
                                            .content(showContent ? contentText : null)
                                            .videoUrl(showContent ? lesson.getVideoUrl() : null)
                                            .sectionId(chapter.getId().toString())
                                            .sectionTitle(chapter.getTitle())
                                            .courseId(course.getId().toString())
                                            .courseTitle(course.getTitle())
                                            .isPreview(lessonFree)
                                            .locked(!showContent)
                                            .sections(sectionResponses)
                                            .build();
                                    return ResponseEntity.ok(ApiResponse.success(response, "Thông tin bài học"));
                                })
                        )
                )
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Bài học", lessonId));
    }

    @Operation(summary = "Get lessons by chapter ID")
    @GetMapping("/chapters/{chapterId}/lessons")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<List<LessonResponse>>> getChapterLessons(
            @PathVariable UUID chapterId,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        // P1: Verify ownership via chapter → course
        var chapter = chapterRepository.findById(chapterId)
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Chương", chapterId));
        verifyCourseOwnership(chapter.getCourseId(), user);
        List<LessonJpaEntity> lessons = lessonRepository.findByChapterIdOrderByOrderIndex(chapterId);

        List<LessonResponse> response = lessons.stream()
                .map(l -> {
                    List<SectionResponse> sectionResponses = new ArrayList<>();
                    if (l.getContentBlocks() != null) {
                        for (var block : l.getContentBlocks()) {
                            Map<String, Object> data = block.getData() != null ? block.getData() : new HashMap<>();
                            sectionResponses.add(SectionResponse.builder()
                                .id(block.getId())
                                .title((String) data.getOrDefault("title", "Untitled"))
                                .type(block.getType())
                                .content((String) data.get("content"))
                                .videoUrl((String) data.get("videoUrl"))
                                .fileUrl((String) data.get("fileUrl"))
                                .duration(data.get("duration") != null ? ((Number) data.get("duration")).intValue() : 0)
                                .orderIndex(data.get("orderIndex") != null ? ((Number) data.get("orderIndex")).intValue() : 0)
                                .isRequired(data.get("isRequired") != null ? (Boolean) data.get("isRequired") : false)
                                .build());
                        }
                    }
                    return LessonResponse.builder()
                        .id(l.getId().toString())
                        .title(l.getTitle())
                        .description(l.getDescription())
                        .type(l.getType() != null ? l.getType().name() : "LECTURE")
                        .durationMinutes(l.getDurationMinutes())
                        .orderIndex(l.getOrderIndex())
                        .isFree(l.getIsFree() != null && l.getIsFree())
                        .sections(sectionResponses)
                        .build();
                })
                .toList();

        return ResponseEntity.ok(ApiResponse.success(response, "Danh sách bài học"));
    }

    @Operation(summary = "Get chapter details by ID")
    @GetMapping("/chapters/{chapterId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ChapterResponse>> getChapterById(
            @PathVariable UUID chapterId
    ) {
        return chapterRepository.findById(chapterId)
                .map(ch -> {
                    ChapterResponse response = ChapterResponse.builder()
                            .id(ch.getId().toString())
                            .title(ch.getTitle())
                            .description(ch.getDescription())
                            .orderIndex(ch.getOrderIndex())
                            .lessons(new ArrayList<>())
                            .build();
                    return ResponseEntity.ok(ApiResponse.success(response, "Thông tin chương"));
                })
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Chương", chapterId));
    }

    // === Mapping methods ===
    
    private CourseSummaryResponse toSummary(Course course) {
        String teacherName = resolveTeacherName(course.getTeacherId());
        String categoryName = resolveCategoryName(course.getCategoryId());
        return CourseSummaryResponse.builder()
                .id(course.getId().toString())
                .title(course.getTitle())
                .description(course.getDescription())
                .thumbnailUrl(course.getThumbnailUrl())
                .status(course.getStatus().name().toLowerCase())
                .teacherName(teacherName)
                .createdAt(course.getCreatedAt() != null ? course.getCreatedAt().toString() : null)
                .categoryName(categoryName)
                .build();
    }

    private CourseSummaryResponse toSummaryBatch(Course course, Map<UUID, String> teacherNameMap, Map<UUID, String> categoryNameMap) {
        String teacherName = course.getTeacherId() != null ? teacherNameMap.getOrDefault(course.getTeacherId(), "") : "";
        String categoryName = course.getCategoryId() != null ? categoryNameMap.get(course.getCategoryId()) : null;
        return CourseSummaryResponse.builder()
                .id(course.getId().toString())
                .title(course.getTitle())
                .description(course.getDescription())
                .thumbnailUrl(course.getThumbnailUrl())
                .status(course.getStatus().name().toLowerCase())
                .teacherName(teacherName)
                .createdAt(course.getCreatedAt() != null ? course.getCreatedAt().toString() : null)
                .categoryName(categoryName)
                .build();
    }

    private CourseDetailResponse toDetail(Course course) {
        String teacherName = resolveTeacherName(course.getTeacherId());
        String categoryName = resolveCategoryName(course.getCategoryId());

        return CourseDetailResponse.builder()
                .id(course.getId().toString())
                .title(course.getTitle())
                .description(course.getDescription())
                .thumbnailUrl(course.getThumbnailUrl())
                .status(course.getStatus().name().toLowerCase())
                .code(course.getCode() != null ? course.getCode().getValue() : null)
                .teacherId(course.getTeacherId() != null ? course.getTeacherId().toString() : null)
                .teacherName(teacherName)
                .deliveryMode(course.getDeliveryMode() != null ? course.getDeliveryMode().name() : "SELF_PACED")
                // Category
                .categoryId(course.getCategoryId() != null ? course.getCategoryId().toString() : null)
                .categoryName(categoryName)
                // Extended info
                .tags(course.getTags() != null ? new ArrayList<>(course.getTags()) : List.of())
                .welcomeMessage(course.getWelcomeMessage())
                .courseInformation(course.getCourseInformation())
                .benefits(course.getBenefits())
                .introVideoUrl(course.getIntroVideoUrl())
                .credits(course.getCredits())
                // Visibility & Pricing
                .visibility(course.getVisibility() != null ? course.getVisibility().name() : "PUBLIC")
                .priceType(course.getPriceType() != null ? course.getPriceType().name() : "FREE")
                .price(course.getPrice())
                .salePrice(course.getSalePrice())
                // Counts & timestamps
                .chapterCount(course.getChapters() != null ? course.getChapters().size() : 0)
                .createdAt(course.getCreatedAt() != null ? course.getCreatedAt().toString() : null)
                .updatedAt(course.getUpdatedAt() != null ? course.getUpdatedAt().toString() : null)
                .build();
    }

    private String resolveTeacherName(UUID teacherId) {
        if (teacherId == null) return "";
        return userJpaRepository.findById(teacherId)
                .map(u -> u.getFullName())
                .orElse("");
    }

    private String resolveCategoryName(UUID categoryId) {
        if (categoryId == null) return null;
        return categoryJpaRepository.findById(categoryId)
                .map(c -> c.getName())
                .orElse(null);
    }

    // === Paywall Helper ===

    /**
     * Check if content is unlocked for the given user and course.
     * Accepts courseId (fetches course) or use the overload with Course object to avoid redundant fetch.
     */
    private boolean isContentUnlocked(UUID courseId, UserJpaEntity currentUser) {
        var courseOpt = courseRepository.findById(courseId);
        if (courseOpt.isEmpty()) return false;
        return isContentUnlocked(courseOpt.get(), currentUser);
    }

    private boolean isContentUnlocked(Course course, UserJpaEntity currentUser) {
        boolean isFreeOrZero = (course.getPrice() == null || course.getPrice().compareTo(BigDecimal.ZERO) <= 0)
                || (course.getSalePrice() != null && course.getSalePrice().compareTo(BigDecimal.ZERO) <= 0);
        if (isFreeOrZero) return true;

        if (currentUser == null) return false;

        if (isAdminRole(currentUser) || currentUser.getRole() == UserJpaEntity.UserRole.TEACHER) return true;

        return paymentRepository.existsByStudentIdAndCourseIdAndStatus(
                currentUser.getId(), course.getId(), PaymentTransactionJpaEntity.PaymentStatus.COMPLETED);
    }

    // === Ownership Helpers ===

    private boolean isAdminRole(UserJpaEntity user) {
        return user.getRole() == UserJpaEntity.UserRole.ADMIN
            || user.getRole() == UserJpaEntity.UserRole.ORG_ADMIN;
    }

    private void verifyCourseOwnership(UUID courseId, UserJpaEntity user) {
        if (isAdminRole(user)) return;
        var course = courseRepository.findById(courseId)
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Khóa học", courseId));
        if (!course.getTeacherId().equals(user.getId())) {
            throw new org.springframework.security.access.AccessDeniedException("Bạn không sở hữu khóa học này");
        }
    }

    // === Response DTOs ===

    @lombok.Builder
    @lombok.Data
    public static class CourseSummaryResponse {
        private String id;
        private String title;
        private String description;
        private String thumbnailUrl;
        private String status;
        private String teacherName;
        private String createdAt;
        private String categoryName;
    }

    @lombok.Builder
    @lombok.Data
    public static class CourseDetailResponse {
        private String id;
        private String title;
        private String description;
        private String thumbnailUrl;
        private String status;
        private String code;
        private String teacherId;
        private String teacherName;
        private String deliveryMode;
        // Category
        private String categoryId;
        private String categoryName;
        // Extended info
        private List<String> tags;
        private String welcomeMessage;
        private String courseInformation;
        private String benefits;
        private String introVideoUrl;
        private Integer credits;
        // Visibility & Pricing
        private String visibility;
        private String priceType;
        private java.math.BigDecimal price;
        private java.math.BigDecimal salePrice;
        // Counts & timestamps
        private Integer chapterCount;
        private String createdAt;
        private String updatedAt;
    }

    @lombok.Builder
    @lombok.Data
    public static class ChapterResponse {
        private String id;
        private String title;
        private String description;
        private Integer orderIndex;
        private List<LessonResponse> lessons;
    }

    @lombok.Builder
    @lombok.Data
    public static class LessonResponse {
        private String id;
        private String title;
        private String description;
        private String type;
        private Integer durationMinutes;
        private Integer orderIndex;
        private Boolean isFree;
        private Boolean locked;
        private List<SectionResponse> sections;
    }

    @lombok.Builder
    @lombok.Data
    public static class SectionResponse {
        private String id;
        private String title;
        private String type;
        private String content;
        private String videoUrl;
        private String fileUrl;
        private Integer duration; // seconds
        private Integer orderIndex;
        private Boolean isRequired;
    }

    @lombok.Builder
    @lombok.Data
    public static class LessonDetailResponse {
        private String id;
        private String title;
        private String description;
        private String lessonType;
        private Integer durationMinutes;
        private Integer orderIndex;
        private String content;
        private String videoUrl;
        private String sectionId;
        private String sectionTitle;
        private String courseId;
        private String courseTitle;
        private Boolean isPreview;
        private Boolean locked;
        private List<SectionResponse> sections;
    }
}

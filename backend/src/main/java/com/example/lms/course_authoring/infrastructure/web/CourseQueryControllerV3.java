package com.example.lms.course_authoring.infrastructure.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.QuestionJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.QuizJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuestionJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizJpaRepositoryV3;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.course_authoring.infrastructure.service.CoursePublicationService;
import com.example.lms.course_authoring.infrastructure.persistence.entity.LessonJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.EnrollmentRepositoryImpl;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepository;
import com.example.lms.learning_delivery.infrastructure.service.VideoAssetPresentationService;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import com.example.lms.shared.infrastructure.service.PublicAssetUrlService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseCategoryJpaEntity;
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
    private final JpaEnrollmentRepository enrollmentJpaRepository;
    private final com.example.lms.course_authoring.infrastructure.persistence.repository.ChapterJpaRepository chapterRepository;
    private final UserJpaRepository userJpaRepository;
    private final com.example.lms.course_authoring.infrastructure.persistence.repository.CourseCategoryJpaRepository courseCategoryJpaRepository;
    private final PaymentTransactionJpaRepository paymentRepository;
    private final QuizJpaRepositoryV3 quizJpaRepository;
    private final AssignmentJpaRepository assignmentJpaRepository;
    private final QuestionJpaRepository questionJpaRepository;
    private final CoursePublicationService coursePublicationService;
    private final VideoAssetPresentationService videoAssetPresentationService;
    private final ObjectMapper objectMapper;
    private final com.example.lms.learning_delivery.infrastructure.persistence.ClassTeacherJpaRepository classTeacherJpaRepository;
    private final PublicAssetUrlService publicAssetUrlService;

    @Operation(summary = "Get all published courses")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<CourseSummaryResponse>>> getPublicCourses(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String deliveryMode,
            @RequestParam(required = false, defaultValue = "createdAt") String sort,
            @RequestParam(required = false, defaultValue = "desc") String order
    ) {
        Set<UUID> categoryFilterIds = resolveCategoryFilterIds(category);
        if (hasText(category) && categoryFilterIds.isEmpty()) {
            return emptyPublicCoursePage(page, size);
        }

        PageRequest pageable = PageRequest.of(
                Math.max(0, page),
                Math.min(Math.max(1, size), 100),
                resolveCourseSort(sort, order)
        );
        Page<Course> courses = courseRepository.findByStatusAndFilters(
                Course.CourseStatus.APPROVED,
                categoryFilterIds,
                parseDeliveryMode(deliveryMode),
                normalizeSearch(search),
                pageable
        );
        
        // Batch-fetch teacher names and category names to prevent N+1
        Set<UUID> teacherIds = courses.getContent().stream()
                .map(Course::getTeacherId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<UUID, String> teacherNameMap = teacherIds.isEmpty() ? Map.of() :
                userJpaRepository.findAllById(teacherIds).stream()
                        .collect(Collectors.toMap(u -> u.getId(), u -> u.getFullName()));

        Set<UUID> categoryIds = courses.getContent().stream()
                .map(Course::getCategoryId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<UUID, String> categoryNameMap = categoryIds.isEmpty() ? Map.of() :
                courseCategoryJpaRepository.findAllById(categoryIds).stream()
                        .collect(Collectors.toMap(c -> c.getId(), c -> c.getName()));

        Set<UUID> courseIds = courses.getContent().stream()
                .map(Course::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<UUID, Long> enrollmentCountMap = courseIds.isEmpty() ? Map.of() :
                enrollmentJpaRepository.countEnrollmentsByCourseIds(new ArrayList<>(courseIds)).stream()
                        .collect(Collectors.toMap(
                                row -> (UUID) row[0],
                                row -> (Long) row[1]
                        ));

        Map<UUID, Long> chapterCountMap = courseIds.isEmpty() ? Map.of() :
                chapterRepository.countByCourseIds(new ArrayList<>(courseIds)).stream()
                        .collect(Collectors.toMap(
                                row -> (UUID) row[0],
                                row -> (Long) row[1]
                        ));

        Map<UUID, Map<String, Object>> publishedDetails = Optional
                .ofNullable(coursePublicationService.getPublishedDetails(courseIds, null))
                .orElse(Map.of());

        Page<CourseSummaryResponse> response = courses.map(course ->
                toSummaryBatch(course, teacherNameMap, categoryNameMap, enrollmentCountMap, chapterCountMap,
                        publishedDetails.get(course.getId())));
        return ResponseEntity.ok(ApiResponse.success(response, "Danh sách khóa học"));
    }

    // my-courses moved to TeacherCourseControllerV3

    @Operation(summary = "Get course details by ID")
    @GetMapping("/{courseId}")
    public ResponseEntity<ApiResponse<CourseDetailResponse>> getCourseById(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal UserJpaEntity currentUser
    ) {
        CourseDetailResponse publishedDetail = (shouldPreferDraftCourseView(currentUser)
                || isCourseOwnerOrCoTeacher(courseId, currentUser))
                ? null
                : getPublishedCourseDetail(courseId, currentUser);
        if (publishedDetail != null) {
            return ResponseEntity.ok(ApiResponse.success(publishedDetail, "Thông tin khóa học"));
        }

        // Fallback to direct DB query — with access check for unpublished/private courses
        return courseRepository.findByIdWithContent(courseId)
                .map(course -> {
                    verifyCourseAccess(course, currentUser);
                    return ResponseEntity.ok(ApiResponse.success(toDetail(course), "Thông tin khóa học"));
                })
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Khóa học", courseId));
    }

    public ResponseEntity<ApiResponse<CourseDetailResponse>> getCourseById(UUID courseId) {
        return getCourseById(courseId, null);
    }

    @Operation(summary = "Batch check course content versions (for PWA offline freshness)")
    @GetMapping("/versions")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCourseVersions(
            @RequestParam List<UUID> ids,
            @AuthenticationPrincipal UserJpaEntity currentUser
    ) {
        if (ids == null || ids.isEmpty() || ids.size() > 50) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Cần 1-50 course IDs"));
        }

        Map<String, Object> versions = new LinkedHashMap<>();
        for (UUID id : ids) {
            CoursePublicationService.VersionInfo versionInfo = coursePublicationService.resolveVersionInfo(id, currentUserId(currentUser));
            if (versionInfo != null) {
                Map<String, Object> info = new LinkedHashMap<>();
                info.put("publicationId", versionInfo.publicationId() != null ? versionInfo.publicationId().toString() : null);
                info.put("publicationNumber", versionInfo.publicationNumber());
                info.put("contentVersion", versionInfo.contentVersion());
                info.put("updatedAt", versionInfo.updatedAt() != null ? versionInfo.updatedAt().toString() : null);
                info.put("versionMode", versionInfo.versionMode());
                info.put("updateAvailable", versionInfo.updateAvailable());
                versions.put(id.toString(), info);
            }
        }

        return ResponseEntity.ok(ApiResponse.success(versions, "Course versions"));
    }

    @Operation(summary = "Get course content (chapters and lessons)")
    @GetMapping("/{courseId}/content")
    public ResponseEntity<ApiResponse<List<ChapterResponse>>> getCourseContent(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal UserJpaEntity currentUser
    ) {
        List<ChapterResponse> publishedChapters = (shouldPreferDraftCourseView(currentUser)
                || isCourseOwnerOrCoTeacher(courseId, currentUser))
                ? null
                : getPublishedCourseContent(courseId, currentUser);
        if (publishedChapters != null) {
            return ResponseEntity.ok(ApiResponse.success(publishedChapters, "Nội dung khóa học"));
        }

        // Access check for unpublished/private courses
        courseRepository.findById(courseId).ifPresent(course -> verifyCourseAccess(course, currentUser));

        // Query chapters and lessons directly from JPA repositories
        var chapterEntities = chapterRepository.findByCourseIdOrderByOrderIndex(courseId);

        if (chapterEntities.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(new ArrayList<>(), "Khóa học chưa có nội dung"));
        }

        // Paywall check: determine if content should be gated
        boolean contentUnlocked = isContentUnlocked(courseId, currentUser);

        List<ChapterResponse> chapters = new ArrayList<>();
        for (var ch : chapterEntities) {
            var lessonEntities = lessonRepository.findByChapterIdOrderByOrderIndex(ch.getId());
            Map<UUID, QuizJpaEntity> quizMap = loadQuizMap(lessonEntities.stream()
                    .map(LessonJpaEntity::getId)
                    .toList());
            Map<UUID, AssignmentJpaEntity> assignmentMap = loadAssignmentMap(lessonEntities.stream()
                    .map(LessonJpaEntity::getId)
                    .toList());

            List<LessonResponse> lessonResponses = new ArrayList<>();
            for (var l : lessonEntities) {
                boolean lessonFree = l.getIsFree() != null && l.getIsFree();
                boolean showContent = contentUnlocked || lessonFree;
                lessonResponses.add(toLessonResponse(
                        l,
                        showContent,
                        lessonFree,
                        quizMap.get(l.getId()),
                        assignmentMap.get(l.getId())));
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
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
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
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
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
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
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
        // Authors (teacher owner, ADMIN, ORG_ADMIN) get the live draft so the
        // /preview surface reflects unsaved-since-publish changes (e.g. new
        // sections added in the editor). Students/learners get the published
        // snapshot below. Without this branch, sidebar reads draft (N sections)
        // but lesson detail returns published snapshot (older N-1 sections),
        // and clicking the new section leaves currentSection() null → blank
        // video frame (issue 2026-04-30: YouTube section invisible in preview).
        if (shouldPreferDraftLessonView(lessonId, currentUser)) {
            return loadDraftLessonDetail(lessonId, currentUser);
        }

        try {
            LessonDetailResponse publishedLesson = getPublishedLessonDetail(lessonId, currentUser);
            if (publishedLesson != null) {
                return ResponseEntity.ok(ApiResponse.success(publishedLesson, "Thông tin bài học"));
            }
        } catch (Exception e) {
            // Published path failed — fall through to draft query
        }

        return loadDraftLessonDetail(lessonId, currentUser);
    }

    private boolean shouldPreferDraftLessonView(UUID lessonId, UserJpaEntity currentUser) {
        if (currentUser == null) {
            return false;
        }
        if (isSystemAdminRole(currentUser) || isOrgAdminRole(currentUser)) {
            return true;
        }
        if (currentUser.getRole() != UserJpaEntity.UserRole.TEACHER) {
            return false;
        }
        // Teacher only sees draft for courses they own. Avoids leaking another
        // teacher's unpublished work-in-progress.
        return lessonRepository.findById(lessonId)
                .flatMap(lesson -> chapterRepository.findById(lesson.getChapterId()))
                .flatMap(chapter -> courseRepository.findById(chapter.getCourseId()))
                .map(course -> course.getTeacherId() != null
                        && course.getTeacherId().equals(currentUser.getId()))
                .orElse(false);
    }

    private ResponseEntity<ApiResponse<LessonDetailResponse>> loadDraftLessonDetail(
            UUID lessonId, UserJpaEntity currentUser) {
        // Query chain: Lesson -> Chapter -> Course (3 indexed queries, no nested loops)
        return lessonRepository.findById(lessonId)
                .flatMap(lesson -> chapterRepository.findById(lesson.getChapterId())
                        .flatMap(chapter -> courseRepository.findById(chapter.getCourseId())
                                .map(course -> {
                                    // Paywall check (use Course overload to avoid redundant fetch)
                                    boolean lessonFree = lesson.getIsFree() != null && lesson.getIsFree();
                                    boolean showContent = isContentUnlocked(course, currentUser) || lessonFree;

                                    // Build sections from contentBlocks
                                    List<SectionResponse> sectionResponses = buildSectionResponses(lesson, showContent);
                                    String contentText = null;
                                    if (lesson.getContentBlocks() != null) {
                                        if (showContent) {
                                            // Populate content from first TEXT block as fallback
                                            contentText = lesson.getContentBlocks().stream()
                                                .filter(b -> "TEXT".equalsIgnoreCase(b.getType()) && b.getData() != null)
                                                .map(b -> {
                                                    Object c = b.getData().get("content");
                                                    return c != null ? c.toString() : null;
                                                })
                                                .filter(java.util.Objects::nonNull)
                                                .findFirst().orElse(null);
                                        }
                                    }
                                    QuizJpaEntity quiz = quizJpaRepository.findByLessonId(lessonId).stream()
                                            .sorted(Comparator.comparing(
                                                    QuizJpaEntity::getCreatedAt,
                                                    Comparator.nullsLast(Comparator.naturalOrder()))
                                                    .reversed())
                                            .findFirst()
                                            .orElse(null);
                                    AssignmentJpaEntity assignment = assignmentJpaRepository.findByLessonId(lessonId).stream()
                                            .sorted(Comparator.comparing(
                                                    AssignmentJpaEntity::getUpdatedAt,
                                                    Comparator.nullsLast(Comparator.naturalOrder()))
                                                    .reversed())
                                            .findFirst()
                                            .orElse(null);

                                    LessonDetailResponse response = LessonDetailResponse.builder()
                                            .id(lesson.getId().toString())
                                            .title(lesson.getTitle())
                                            .description(lesson.getDescription())
                                            .type(lesson.getType() != null ? lesson.getType().name() : "LECTURE")
                                            .lessonType(lesson.getType() != null ? lesson.getType().name() : "LECTURE")
                                            .durationMinutes(lesson.getDurationMinutes())
                                            .orderIndex(lesson.getOrderIndex())
                                            .content(showContent ? contentText : null)
                                            .videoUrl(showContent ? lesson.getVideoUrl() : null)
                                            .streamVideoUid(lesson.getStreamVideoUid())
                                            .quizType(quiz != null && quiz.getAssessmentType() != null ? quiz.getAssessmentType().name() : "ASSESSMENT")
                                            .countsTowardCertificate(quiz != null && Boolean.TRUE.equals(quiz.getCountsTowardCertificate()))
                                            .quizAllowOffline(quiz != null && quiz.getAssessmentType() == QuizJpaEntity.AssessmentType.PRACTICE)
                                            .quizTimeLimit(quiz != null ? quiz.getTimeLimitMinutes() : null)
                                            .quizPassingScore(quiz != null ? quiz.getPassingScore() : null)
                                            .quizMaxScore(quiz != null ? quiz.getPassingScore() : null)
                                            .quizMaxAttempts(quiz != null ? quiz.getMaxAttempts() : null)
                                            .assignment(toAssignmentInfo(assignment))
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
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<List<LessonResponse>>> getChapterLessons(
            @PathVariable UUID chapterId,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        // P1: Verify ownership via chapter → course
        var chapter = chapterRepository.findById(chapterId)
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Chương", chapterId));
        verifyCourseOwnership(chapter.getCourseId(), user);
        List<LessonJpaEntity> lessons = lessonRepository.findByChapterIdOrderByOrderIndex(chapterId);
        Map<UUID, QuizJpaEntity> quizMap = loadQuizMap(lessons.stream().map(LessonJpaEntity::getId).toList());
        Map<UUID, AssignmentJpaEntity> assignmentMap = loadAssignmentMap(lessons.stream().map(LessonJpaEntity::getId).toList());

        List<LessonResponse> response = lessons.stream()
                .map(l -> toLessonResponse(
                        l,
                        true,
                        l.getIsFree() != null && l.getIsFree(),
                        quizMap.get(l.getId()),
                        assignmentMap.get(l.getId())))
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

    private UUID currentUserId(UserJpaEntity currentUser) {
        return currentUser != null ? currentUser.getId() : null;
    }

    private CourseDetailResponse getPublishedCourseDetail(UUID courseId, UserJpaEntity currentUser) {
        Map<String, Object> publishedDetail = coursePublicationService.getPublishedDetail(courseId, currentUserId(currentUser));
        if (publishedDetail == null || publishedDetail.isEmpty()) {
            return null;
        }

        CourseDetailResponse response = objectMapper.convertValue(publishedDetail, CourseDetailResponse.class);
        if (response == null) {
            return null;
        }
        CoursePublicationService.VersionInfo versionInfo = coursePublicationService.resolveVersionInfo(courseId, currentUserId(currentUser));
        if (versionInfo != null) {
            response.setPublicationId(versionInfo.publicationId() != null ? versionInfo.publicationId().toString() : null);
            response.setPublicationNumber(versionInfo.publicationNumber());
            response.setVersionMode(versionInfo.versionMode());
            response.setUpdateAvailable(versionInfo.updateAvailable());
        }
        response.setThumbnailUrl(publicAssetUrlService.resolveCourseThumbnailUrl(response.getThumbnailUrl()));
        return response;
    }

    private List<ChapterResponse> getPublishedCourseContent(UUID courseId, UserJpaEntity currentUser) {
        List<Map<String, Object>> publishedContent = coursePublicationService.getPublishedContent(courseId, currentUserId(currentUser));
        if (publishedContent == null) {
            return null;
        }

        List<ChapterResponse> chapters = publishedContent.stream()
                .map(item -> objectMapper.convertValue(item, ChapterResponse.class))
                .toList();
        hydratePublishedLessonMedia(chapters);

        Course course = courseRepository.findById(courseId).orElse(null);
        if (course != null && !isContentUnlocked(course, currentUser)) {
            return maskLockedPublishedChapters(chapters);
        }

        return chapters;
    }

    private void hydratePublishedLessonMedia(List<ChapterResponse> chapters) {
        if (chapters == null || chapters.isEmpty()) {
            return;
        }

        List<UUID> lessonIds = chapters.stream()
                .filter(Objects::nonNull)
                .flatMap(chapter -> Optional.ofNullable(chapter.getLessons()).orElse(List.of()).stream())
                .map(LessonResponse::getId)
                .filter(Objects::nonNull)
                .map(UUID::fromString)
                .toList();

        if (lessonIds.isEmpty()) {
            return;
        }

        Map<UUID, LessonJpaEntity> lessonMap = lessonRepository.findAllById(lessonIds).stream()
                .collect(Collectors.toMap(LessonJpaEntity::getId, lesson -> lesson));

        for (ChapterResponse chapter : chapters) {
            if (chapter.getLessons() == null) {
                continue;
            }
            for (LessonResponse lesson : chapter.getLessons()) {
                if (lesson.getId() == null) {
                    continue;
                }
                LessonJpaEntity persistedLesson = lessonMap.get(UUID.fromString(lesson.getId()));
                if (persistedLesson == null) {
                    continue;
                }

                boolean hasSectionVideo = lesson.getSections() != null
                        && lesson.getSections().stream().anyMatch(section -> "VIDEO".equalsIgnoreCase(section.getType()));

                if ((lesson.getVideoUrl() == null || lesson.getVideoUrl().isBlank()) && !hasSectionVideo) {
                    lesson.setVideoUrl(persistedLesson.getVideoUrl());
                }

                if ((lesson.getStreamVideoUid() == null || lesson.getStreamVideoUid().isBlank()) && !hasSectionVideo) {
                    lesson.setStreamVideoUid(persistedLesson.getStreamVideoUid());
                }
            }
        }
    }

    private LessonDetailResponse getPublishedLessonDetail(UUID lessonId, UserJpaEntity currentUser) {
        Course course = courseRepository.findByLessonId(lessonId).orElse(null);
        if (course == null) {
            return null;
        }

        List<ChapterResponse> chapters = getPublishedCourseContent(course.getId(), currentUser);
        if (chapters == null) {
            return null;
        }

        for (ChapterResponse chapter : chapters) {
            if (chapter.getLessons() == null) {
                continue;
            }
            for (LessonResponse lesson : chapter.getLessons()) {
                if (lessonId.toString().equals(lesson.getId())) {
                    return toPublishedLessonDetail(course, chapter, lesson);
                }
            }
        }

        return null;
    }

    private LessonDetailResponse toPublishedLessonDetail(Course course, ChapterResponse chapter, LessonResponse lesson) {
        String textContent = null;
        String videoUrl = lesson.getVideoUrl();
        String streamVideoUid = lesson.getStreamVideoUid();

        if (lesson.getSections() != null) {
            for (SectionResponse section : lesson.getSections()) {
                if (textContent == null && "TEXT".equalsIgnoreCase(section.getType()) && section.getContent() != null) {
                    textContent = section.getContent();
                }
                if (videoUrl == null && "VIDEO".equalsIgnoreCase(section.getType())) {
                    videoUrl = section.getVideoUrl();
                    if (streamVideoUid == null) {
                        streamVideoUid = section.getStreamVideoUid();
                    }
                }
            }
        }

        return LessonDetailResponse.builder()
                .id(lesson.getId())
                .title(lesson.getTitle())
                .description(lesson.getDescription())
                .type(lesson.getType())
                .lessonType(lesson.getLessonType())
                .durationMinutes(lesson.getDurationMinutes())
                .orderIndex(lesson.getOrderIndex())
                .content(textContent)
                .videoUrl(videoUrl)
                .streamVideoUid(streamVideoUid)
                .quizType(lesson.getQuizType())
                .countsTowardCertificate(lesson.getCountsTowardCertificate())
                .quizAllowOffline(lesson.getQuizAllowOffline())
                .quizTimeLimit(lesson.getQuizTimeLimit())
                .quizPassingScore(lesson.getQuizPassingScore())
                .quizMaxScore(lesson.getQuizMaxScore())
                .quizMaxAttempts(lesson.getQuizMaxAttempts())
                .assignment(lesson.getAssignment())
                .sectionId(chapter.getId())
                .sectionTitle(chapter.getTitle())
                .courseId(course.getId().toString())
                .courseTitle(course.getTitle())
                .isPreview(Boolean.TRUE.equals(lesson.getIsFree()))
                .locked(Boolean.TRUE.equals(lesson.getLocked()))
                .sections(lesson.getSections())
                .build();
    }

    private List<ChapterResponse> maskLockedPublishedChapters(List<ChapterResponse> chapters) {
        for (ChapterResponse chapter : chapters) {
            if (chapter.getLessons() == null) {
                continue;
            }
            for (LessonResponse lesson : chapter.getLessons()) {
                if (Boolean.TRUE.equals(lesson.getIsFree())) {
                    lesson.setLocked(false);
                    continue;
                }
                lesson.setLocked(true);
                lesson.setStreamVideoUid(null);
                if (lesson.getSections() == null) {
                    continue;
                }
                for (SectionResponse section : lesson.getSections()) {
                    section.setContent(null);
                    section.setVideoUrl(null);
                    section.setVideoType(null);
                    section.setStreamVideoUid(null);
                    section.setFileUrl(null);
                    section.setPreviewPdfUrl(null);
                    section.setPreviewStatus(null);
                    section.setQuizData(null);
                    section.setInteractiveVideoSpec(null);
                }
            }
        }
        return chapters;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String normalizeSearch(String search) {
        return hasText(search) ? search.trim() : null;
    }

    private Sort resolveCourseSort(String sort, String order) {
        String sortField = "title".equals(sort) ? "title" : "created_at";
        return "asc".equalsIgnoreCase(order) ? Sort.by(sortField).ascending() : Sort.by(sortField).descending();
    }

    private Course.DeliveryMode parseDeliveryMode(String value) {
        if (!hasText(value)) return null;
        try {
            return Course.DeliveryMode.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    private Set<UUID> resolveCategoryFilterIds(String category) {
        if (!hasText(category)) return Set.of();
        Optional<CourseCategoryJpaEntity> matchedCategory = courseCategoryJpaRepository
                .findByCode(category.trim().toUpperCase(Locale.ROOT))
                .or(() -> courseCategoryJpaRepository.findBySlug(category.trim().toLowerCase(Locale.ROOT)));
        if (matchedCategory.isEmpty()) return Set.of();

        CourseCategoryJpaEntity rootOrLeaf = matchedCategory.get();
        Set<UUID> categoryIds = new LinkedHashSet<>();
        categoryIds.add(rootOrLeaf.getId());
        courseCategoryJpaRepository.findByParentIdOrderBySortOrder(rootOrLeaf.getId()).stream()
                .map(CourseCategoryJpaEntity::getId)
                .forEach(categoryIds::add);
        return categoryIds;
    }

    private ResponseEntity<ApiResponse<Page<CourseSummaryResponse>>> emptyPublicCoursePage(int page, int size) {
        PageRequest pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100));
        return ResponseEntity.ok(ApiResponse.success(
                new PageImpl<>(Collections.emptyList(), pageable, 0),
                "Danh sách khóa học"
        ));
    }

    private CourseSummaryResponse toSummary(Course course) {
        String teacherName = resolveTeacherName(course.getTeacherId());
        String categoryName = resolveCategoryName(course.getCategoryId());
        return CourseSummaryResponse.builder()
                .id(course.getId().toString())
                .title(course.getTitle())
                .description(course.getDescription())
                .thumbnailUrl(publicAssetUrlService.resolveCourseThumbnailUrl(course.getThumbnailUrl()))
                .status(course.getStatus().name().toLowerCase())
                .teacherName(teacherName)
                .createdAt(course.getCreatedAt() != null ? course.getCreatedAt().toString() : null)
                .categoryName(categoryName)
                .build();
    }

    private CourseSummaryResponse toSummaryBatch(
            Course course,
            Map<UUID, String> teacherNameMap,
            Map<UUID, String> categoryNameMap,
            Map<UUID, Long> enrollmentCountMap,
            Map<UUID, Long> chapterCountMap,
            Map<String, Object> publishedDetail
    ) {
        String teacherName = course.getTeacherId() != null ? teacherNameMap.getOrDefault(course.getTeacherId(), "") : "";
        String categoryName = course.getCategoryId() != null ? categoryNameMap.get(course.getCategoryId()) : null;
        return CourseSummaryResponse.builder()
                .id(course.getId().toString())
                .code(course.getCode() != null ? course.getCode().getValue() : null)
                .title(course.getTitle())
                .description(course.getDescription())
                .thumbnailUrl(resolvePublishedThumbnailUrl(course, publishedDetail))
                .status(course.getStatus().name().toLowerCase())
                .teacherName(teacherName)
                .createdAt(course.getCreatedAt() != null ? course.getCreatedAt().toString() : null)
                .categoryName(categoryName)
                .deliveryMode(course.getDeliveryMode() != null ? course.getDeliveryMode().name() : "SELF_PACED")
                .priceType(course.getPriceType() != null ? course.getPriceType().name() : "FREE")
                .price(course.getPrice())
                .salePrice(course.getSalePrice())
                .allowOfflineDownload(course.isAllowOfflineDownload())
                .enrolledCount(enrollmentCountMap.getOrDefault(course.getId(), 0L).intValue())
                .chapterCount(chapterCountMap.getOrDefault(course.getId(), 0L).intValue())
                .build();
    }

    private String resolvePublishedThumbnailUrl(Course course, Map<String, Object> publishedDetail) {
        if (publishedDetail != null && publishedDetail.containsKey("thumbnailUrl")) {
            Object thumbnailUrl = publishedDetail.get("thumbnailUrl");
            return thumbnailUrl instanceof String value ? publicAssetUrlService.resolveCourseThumbnailUrl(value) : null;
        }
        return publicAssetUrlService.resolveCourseThumbnailUrl(course.getThumbnailUrl());
    }

    private CourseDetailResponse toDetail(Course course) {
        String teacherName = resolveTeacherName(course.getTeacherId());
        String categoryName = resolveCategoryName(course.getCategoryId());
        int enrolledCount = (int) enrollmentJpaRepository.countTotalByCourseIds(List.of(course.getId()));
        VideoAssetPresentationService.VideoAssetView introAssetView = course.getIntroVideoAssetId() == null
                ? null
                : videoAssetPresentationService.getView(course.getIntroVideoAssetId()).orElse(null);
        String introVideoUrl = course.getIntroVideoAssetId() == null
                ? course.getIntroVideoUrl()
                : null;

        return CourseDetailResponse.builder()
                .id(course.getId().toString())
                .title(course.getTitle())
                .description(course.getDescription())
                .thumbnailUrl(publicAssetUrlService.resolveCourseThumbnailUrl(course.getThumbnailUrl()))
                .status(course.getStatus().name().toLowerCase())
                .reviewState(resolveReviewState(course))
                .draftChangeStatus(resolveDraftChangeStatus(course))
                .pendingReleaseNotes(course.getPendingReleaseNotes())
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
                .introVideoUrl(introVideoUrl)
                .introVideoAssetId(course.getIntroVideoAssetId() != null ? course.getIntroVideoAssetId().toString() : null)
                .introVideoProcessingStatus(introAssetView != null ? introAssetView.status() : null)
                .introVideoSourceKind(introAssetView != null ? introAssetView.videoSourceKind() : null)
                .introVideoStreamVideoUid(null)
                .introVideoAvailableOfflineProfiles(introAssetView != null ? introAssetView.availableOfflineProfiles().stream()
                        .map(profile -> {
                            Map<String, Object> option = new LinkedHashMap<>();
                            option.put("id", profile.id());
                            option.put("label", profile.label());
                            option.put("actualResolution", profile.actualResolution());
                            option.put("sizeBytes", profile.sizeBytes());
                            return option;
                        })
                        .toList() : List.of())
                .credits(course.getCredits())
                // Visibility & Pricing
                .visibility(course.getVisibility() != null ? course.getVisibility().name() : "PUBLIC")
                .priceType(course.getPriceType() != null ? course.getPriceType().name() : "FREE")
                .price(course.getPrice())
                .salePrice(course.getSalePrice())
                .allowOfflineDownload(course.isAllowOfflineDownload())
                .contentVersion(course.getContentVersion())
                .enrolledCount(enrolledCount)
                // Counts & timestamps
                .chapterCount((int) chapterRepository.countByCourseId(course.getId()))
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
        return courseCategoryJpaRepository.findById(categoryId)
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

        if (isSystemAdminRole(currentUser) || currentUser.getRole() == UserJpaEntity.UserRole.TEACHER) return true;
        if (hasOrgScopedCourseAccess(course, currentUser)) return true;

        return paymentRepository.existsByStudentIdAndCourseIdAndStatus(
                currentUser.getId(), course.getId(), PaymentTransactionJpaEntity.PaymentStatus.COMPLETED);
    }

    // === Ownership Helpers ===

    private boolean isSystemAdminRole(UserJpaEntity user) {
        return user != null && user.getRole() == UserJpaEntity.UserRole.ADMIN;
    }

    private boolean isOrgAdminRole(UserJpaEntity user) {
        return user != null && user.getRole() == UserJpaEntity.UserRole.ORG_ADMIN;
    }

    private boolean shouldPreferDraftCourseView(UserJpaEntity user) {
        return isSystemAdminRole(user) || isOrgAdminRole(user);
    }

    /**
     * Course OWNER (teacher) cũng xem được draft live data của khóa học mình
     * dạy — pattern Coursera/Udemy/Canvas: teacher preview phải show pending
     * draft changes để verify trước khi submit duyệt. Nếu không, teacher edit
     * xong nhưng preview vẫn hiện published snapshot cũ → confusing UX.
     *
     * Returns true nếu user là teacher chính của course HOẶC co-teacher
     * (assigned in classes tab) — match permission của edit endpoint.
     */
    private boolean isCourseOwnerOrCoTeacher(UUID courseId, UserJpaEntity user) {
        if (user == null) return false;
        return courseRepository.findById(courseId)
                .map(course -> {
                    if (course.getTeacherId() != null && course.getTeacherId().equals(user.getId())) {
                        return true;
                    }
                    return classTeacherJpaRepository.existsByTeacherIdAndCourseId(user.getId(), courseId);
                })
                .orElse(false);
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

    private boolean hasOrgScopedCourseAccess(Course course, UserJpaEntity user) {
        if (!isOrgAdminRole(user) || user.getOrganizationId() == null || course == null || course.getTeacherId() == null) {
            return false;
        }

        return userJpaRepository.findById(course.getTeacherId())
                .map(teacher -> Objects.equals(teacher.getOrganizationId(), user.getOrganizationId()))
                .orElse(false);
    }

    private Map<UUID, QuizJpaEntity> loadQuizMap(List<UUID> lessonIds) {
        if (lessonIds == null || lessonIds.isEmpty()) {
            return Map.of();
        }

        List<QuizJpaEntity> quizzes = new ArrayList<>(quizJpaRepository.findByLessonIdIn(lessonIds));
        quizzes.sort(Comparator.comparing(
                QuizJpaEntity::getCreatedAt,
                Comparator.nullsLast(Comparator.naturalOrder())).reversed());

        Map<UUID, QuizJpaEntity> quizMap = new LinkedHashMap<>();
        for (QuizJpaEntity quiz : quizzes) {
            quizMap.putIfAbsent(quiz.getLessonId(), quiz);
        }
        return quizMap;
    }

    private Map<UUID, AssignmentJpaEntity> loadAssignmentMap(List<UUID> lessonIds) {
        if (lessonIds == null || lessonIds.isEmpty()) {
            return Map.of();
        }

        List<AssignmentJpaEntity> assignments = new ArrayList<>(assignmentJpaRepository.findByLessonIdIn(lessonIds));
        assignments.sort(Comparator.comparing(
                AssignmentJpaEntity::getUpdatedAt,
                Comparator.nullsLast(Comparator.naturalOrder())).reversed());

        Map<UUID, AssignmentJpaEntity> assignmentMap = new LinkedHashMap<>();
        for (AssignmentJpaEntity assignment : assignments) {
            if (assignment.getLessonId() != null) {
                assignmentMap.putIfAbsent(assignment.getLessonId(), assignment);
            }
        }
        return assignmentMap;
    }

    private LessonResponse toLessonResponse(
            LessonJpaEntity lesson,
            boolean showContent,
            boolean lessonFree,
            QuizJpaEntity quiz,
            AssignmentJpaEntity assignment
    ) {
        return LessonResponse.builder()
                .id(lesson.getId().toString())
                .title(lesson.getTitle())
                .description(lesson.getDescription())
                .type(lesson.getType() != null ? lesson.getType().name() : "LECTURE")
                .lessonType(lesson.getType() != null ? lesson.getType().name() : "LECTURE")
                .durationMinutes(lesson.getDurationMinutes())
                .orderIndex(lesson.getOrderIndex())
                .isFree(lessonFree)
                .locked(!showContent)
                .quizType(quiz != null && quiz.getAssessmentType() != null ? quiz.getAssessmentType().name() : "ASSESSMENT")
                .countsTowardCertificate(quiz != null && Boolean.TRUE.equals(quiz.getCountsTowardCertificate()))
                .quizAllowOffline(quiz != null && quiz.getAssessmentType() == QuizJpaEntity.AssessmentType.PRACTICE)
                .quizTimeLimit(quiz != null ? quiz.getTimeLimitMinutes() : null)
                .quizPassingScore(quiz != null ? quiz.getPassingScore() : null)
                .quizMaxScore(quiz != null ? quiz.getPassingScore() : null)
                .quizMaxAttempts(quiz != null ? quiz.getMaxAttempts() : null)
                .assignment(toAssignmentInfo(assignment))
                .sections(buildSectionResponses(lesson, showContent))
                .videoUrl(showContent ? lesson.getVideoUrl() : null)
                .streamVideoUid(null)
                .build();
    }

    private List<SectionResponse> buildSectionResponses(LessonJpaEntity lesson, boolean showContent) {
        List<SectionResponse> sectionResponses = new ArrayList<>();
        if (lesson.getContentBlocks() == null) {
            return sectionResponses;
        }

        long videoSectionCount = lesson.getContentBlocks().stream()
                .filter(block -> "VIDEO".equalsIgnoreCase(block.getType()))
                .count();
        Map<UUID, QuestionJpaEntity> questionMap = loadSectionQuizQuestionMap(lesson.getContentBlocks());
        Map<UUID, VideoAssetPresentationService.VideoAssetView> videoAssets = videoAssetPresentationService.getViews(
                extractVideoAssetIds(lesson.getContentBlocks())
        );
        for (var block : lesson.getContentBlocks()) {
            Map<String, Object> data = block.getData() != null ? block.getData() : new HashMap<>();
            String streamVideoUid = resolveSectionStreamVideoUid(lesson, block, data, videoSectionCount);
            String videoType = resolveSectionVideoType(data, streamVideoUid);
            SectionResponse response = SectionResponse.builder()
                    .id(block.getId())
                    .title((String) data.get("title"))
                    .type(block.getType() != null ? block.getType().toUpperCase(Locale.ROOT) : "TEXT")
                    .content(showContent ? (String) data.get("content") : null)
                    .structuredContent(showContent ? new LinkedHashMap<>(data) : null)
                    .videoUrl(showContent ? (String) data.get("videoUrl") : null)
                    .videoType(showContent ? videoType : null)
                    .streamVideoUid(showContent ? streamVideoUid : null)
                    .fileUrl(showContent ? (String) data.get("fileUrl") : null)
                    .previewPdfUrl(showContent ? (String) data.get("previewPdfUrl") : null)
                    .previewStatus(showContent ? (String) data.get("previewStatus") : null)
                    .duration(safeInt(data.get("duration"), 0))
                    .orderIndex(safeInt(data.get("orderIndex"), 0))
                    .isRequired(safeBool(data.get("isRequired"), false))
                    .quizData(showContent ? buildSectionQuizData(data, questionMap) : null)
                    .interactiveVideoSpec(showContent ? normalizeInteractiveVideoSpec(data.get("interactiveVideoSpec")) : null)
                    .simulationData(showContent ? buildSimulationData(data) : null)
                    .build();
            if (showContent) {
                applyVideoAssetView(response, data, resolveVideoAssetView(videoAssets, data.get("videoAssetId")), videoType);
            } else {
                UUID videoAssetId = parseVideoAssetId(data.get("videoAssetId"));
                if (videoAssetId != null) {
                    response.setVideoAssetId(videoAssetId.toString());
                }
            }
            sectionResponses.add(response);
        }
        return sectionResponses;
    }

    private List<UUID> extractVideoAssetIds(List<com.example.lms.shared.domain.model.ContentBlock> blocks) {
        List<UUID> ids = new ArrayList<>();
        for (var block : blocks) {
            if (block.getData() == null) {
                continue;
            }
            UUID videoAssetId = parseVideoAssetId(block.getData().get("videoAssetId"));
            if (videoAssetId != null) {
                ids.add(videoAssetId);
            }
        }
        return ids;
    }

    private Map<String, Object> buildSimulationData(Map<String, Object> data) {
        Map<String, Object> simulation = new LinkedHashMap<>();
        copyIfPresent(simulation, data, "simulationPackageId");
        copyIfPresent(simulation, data, "simulationVersion");
        copyIfPresent(simulation, data, "entryUrl");
        copyIfPresent(simulation, data, "manifestUrl");
        copyIfPresent(simulation, data, "estimatedSizeBytes");
        copyIfPresent(simulation, data, "allowOffline");
        copyIfPresent(simulation, data, "completionPolicy");
        copyIfPresent(simulation, data, "supportedTargets");
        copyIfPresent(simulation, data, "fallback");
        return simulation.isEmpty() ? null : simulation;
    }

    private void copyIfPresent(Map<String, Object> target, Map<String, Object> source, String key) {
        Object value = source.get(key);
        if (value != null) {
            target.put(key, value);
        }
    }

    private static int safeInt(Object value, int fallback) {
        if (value == null) return fallback;
        if (value instanceof Number n) return n.intValue();
        try { return Integer.parseInt(value.toString()); } catch (Exception e) { return fallback; }
    }

    private static boolean safeBool(Object value, boolean fallback) {
        if (value == null) return fallback;
        if (value instanceof Boolean b) return b;
        return Boolean.parseBoolean(value.toString());
    }

    private UUID parseVideoAssetId(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return UUID.fromString(value.toString());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private VideoAssetPresentationService.VideoAssetView resolveVideoAssetView(
            Map<UUID, VideoAssetPresentationService.VideoAssetView> videoAssets,
            Object rawVideoAssetId
    ) {
        UUID videoAssetId = parseVideoAssetId(rawVideoAssetId);
        return videoAssetId == null ? null : videoAssets.get(videoAssetId);
    }

    private void applyVideoAssetView(
            SectionResponse response,
            Map<String, Object> rawData,
            VideoAssetPresentationService.VideoAssetView assetView,
            String fallbackVideoType
    ) {
        UUID videoAssetId = parseVideoAssetId(rawData.get("videoAssetId"));
        if (videoAssetId != null) {
            response.setVideoAssetId(videoAssetId.toString());
        }
        if (assetView == null) {
            return;
        }

        response.setVideoAssetId(assetView.id().toString());
        response.setVideoProcessingStatus(assetView.status());
        response.setVideoSourceKind(assetView.videoSourceKind());
        response.setAvailableOfflineProfiles(assetView.availableOfflineProfiles().stream()
                .map(profile -> {
                    Map<String, Object> option = new LinkedHashMap<>();
                    option.put("id", profile.id());
                    option.put("label", profile.label());
                    option.put("actualResolution", profile.actualResolution());
                    option.put("sizeBytes", profile.sizeBytes());
                    return option;
                })
                .toList());
        response.setVideoUrl(null);
        response.setStreamVideoUid(null);
        response.setVideoType("ADAPTIVE_R2");
        if (fallbackVideoType != null && !"VIDEO".equalsIgnoreCase(fallbackVideoType)) {
            response.setVideoType(fallbackVideoType);
        }
    }

    private Map<UUID, QuestionJpaEntity> loadSectionQuizQuestionMap(List<com.example.lms.shared.domain.model.ContentBlock> blocks) {
        List<UUID> questionIds = new ArrayList<>();
        for (var block : blocks) {
            if (!"QUIZ".equalsIgnoreCase(block.getType()) || block.getData() == null) {
                continue;
            }
            questionIds.addAll(extractSectionQuizQuestionIds(block.getData()));
        }

        if (questionIds.isEmpty()) {
            return Map.of();
        }

        Map<UUID, QuestionJpaEntity> questionMap = new LinkedHashMap<>();
        for (QuestionJpaEntity question : questionJpaRepository.findAllById(questionIds)) {
            questionMap.put(question.getId(), question);
        }
        return questionMap;
    }

    private Map<String, Object> buildSectionQuizData(
            Map<String, Object> blockData,
            Map<UUID, QuestionJpaEntity> questionMap
    ) {
        Map<String, Object> quizData = asMap(blockData.get("quizData"));
        if (quizData == null) {
            return null;
        }

        Map<String, Object> normalized = new LinkedHashMap<>();
        String quizType = asString(quizData.get("quizType"), "ASSESSMENT");
        normalized.put("quizType", quizType);
        normalized.put("countsTowardCertificate", asBoolean(quizData.get("countsTowardCertificate"), false) && "EXAM".equalsIgnoreCase(quizType));
        normalized.put("allowOffline", "PRACTICE".equalsIgnoreCase(quizType));
        normalized.put("timeLimitMinutes", asInteger(quizData.get("timeLimitMinutes"), 30));
        normalized.put("passingScore", asInteger(quizData.get("passingScore"), 60));
        normalized.put("maxAttempts", asInteger(quizData.get("maxAttempts"), 1));
        normalized.put("shuffleQuestions", asBoolean(quizData.get("shuffleQuestions"), true));
        normalized.put("shuffleOptions", asBoolean(quizData.get("shuffleOptions"), true));
        normalized.put("showResultsImmediately", asBoolean(quizData.get("showResultsImmediately"), true));

        List<UUID> questionIds = extractSectionQuizQuestionIds(blockData);
        if (!questionIds.isEmpty()) {
            List<Map<String, Object>> questions = new ArrayList<>();
            for (UUID questionId : questionIds) {
                QuestionJpaEntity question = questionMap.get(questionId);
                if (question == null) {
                    continue;
                }

                Map<String, Object> questionDto = new LinkedHashMap<>();
                questionDto.put("id", question.getId().toString());
                questionDto.put("content", extractTextFromBlocks(question.getContentBlocks()));
                questionDto.put("difficulty", question.getDifficulty() != null ? question.getDifficulty().name() : "MEDIUM");
                questions.add(questionDto);
            }
            normalized.put("questions", questions);
        } else {
            normalized.put("questions", normalizeLegacySectionQuizQuestions(quizData.get("questions")));
        }

        return normalized;
    }

    private Map<String, Object> normalizeInteractiveVideoSpec(Object value) {
        Map<String, Object> spec = asMap(value);
        if (spec == null || spec.isEmpty()) {
            return null;
        }

        Map<String, Object> normalized = new LinkedHashMap<>(spec);
        normalized.putIfAbsent("version", 1);
        Object timeline = normalized.get("timeline");
        if (!(timeline instanceof List<?>)) {
            normalized.put("timeline", List.of());
        }
        return normalized;
    }

    private String resolveSectionStreamVideoUid(
            LessonJpaEntity lesson,
            com.example.lms.shared.domain.model.ContentBlock block,
            Map<String, Object> blockData,
            long videoSectionCount
    ) {
        String sectionStreamUid = asString(blockData.get("streamVideoUid"), null);
        if (sectionStreamUid != null) {
            return sectionStreamUid;
        }

        if ("VIDEO".equalsIgnoreCase(block.getType()) && videoSectionCount == 1) {
            return lesson.getStreamVideoUid();
        }

        return null;
    }

    private String resolveSectionVideoType(Map<String, Object> blockData, String streamVideoUid) {
        String explicitType = asString(blockData.get("videoType"), null);
        if (explicitType != null) {
            return explicitType;
        }
        return streamVideoUid != null ? "CLOUDFLARE" : null;
    }

    private List<UUID> extractSectionQuizQuestionIds(Map<String, Object> blockData) {
        Map<String, Object> quizData = asMap(blockData.get("quizData"));
        if (quizData == null) {
            return List.of();
        }

        Object rawQuestionIds = quizData.get("questionIds");
        if (!(rawQuestionIds instanceof List<?> questionIdsList)) {
            return List.of();
        }

        List<UUID> questionIds = new ArrayList<>();
        for (Object rawQuestionId : questionIdsList) {
            if (rawQuestionId == null) {
                continue;
            }

            try {
                questionIds.add(UUID.fromString(rawQuestionId.toString()));
            } catch (IllegalArgumentException ignored) {
                // Ignore malformed legacy values instead of breaking the whole section.
            }
        }
        return questionIds;
    }

    private List<Map<String, Object>> normalizeLegacySectionQuizQuestions(Object rawQuestions) {
        if (!(rawQuestions instanceof List<?> questions)) {
            return List.of();
        }

        List<Map<String, Object>> normalized = new ArrayList<>();
        for (Object rawQuestion : questions) {
            Map<String, Object> question = asMap(rawQuestion);
            if (question == null) {
                continue;
            }

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", question.get("id") != null ? question.get("id").toString() : null);
            item.put("content", asString(question.get("content"), ""));
            item.put("difficulty", asString(question.get("difficulty"), "MEDIUM"));
            normalized.add(item);
        }
        return normalized;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> asMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return null;
    }

    private String asString(Object value, String fallback) {
        if (value == null) {
            return fallback;
        }
        String text = value.toString();
        return text.isBlank() ? fallback : text;
    }

    private Integer asInteger(Object value, Integer fallback) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value != null) {
            try {
                return Integer.parseInt(value.toString());
            } catch (NumberFormatException ignored) {
                // Fallback below.
            }
        }
        return fallback;
    }

    private Boolean asBoolean(Object value, boolean fallback) {
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value != null) {
            return Boolean.parseBoolean(value.toString());
        }
        return fallback;
    }

    private String extractTextFromBlocks(List<com.example.lms.shared.domain.model.ContentBlock> blocks) {
        if (blocks == null || blocks.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (var block : blocks) {
            if (block.getData() == null) continue;
            var data = block.getData();
            Object rawText = firstNonNull(data.get("content"), data.get("text"), data.get("html"));
            if (rawText != null && !rawText.toString().isBlank()) {
                if (!sb.isEmpty()) sb.append(" ");
                sb.append(normalizePreviewText(rawText.toString()));
            } else {
                String blockType = block.getType() != null ? block.getType().toLowerCase(java.util.Locale.ROOT) : "";
                String fallback = switch (blockType) {
                    case "image" -> "[Hình ảnh]";
                    case "video" -> "[Video]";
                    case "math", "formula", "katex" -> "[Công thức]";
                    case "table" -> "[Bảng]";
                    default -> null;
                };
                if (fallback != null) {
                    if (!sb.isEmpty()) sb.append(" ");
                    sb.append(fallback);
                }
            }
        }
        return sb.toString();
    }

    private Object firstNonNull(Object... values) {
        for (Object value : values) {
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private String normalizePreviewText(String raw) {
        if (raw == null || raw.isBlank()) {
            return "";
        }

        return raw
                .replaceAll("<[^>]+>", " ")
                .replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private AssignmentInfoResponse toAssignmentInfo(AssignmentJpaEntity assignment) {
        if (assignment == null) {
            return null;
        }

        return AssignmentInfoResponse.builder()
                .id(assignment.getId().toString())
                .title(assignment.getTitle())
                .description(assignment.getDescription())
                .instructions(assignment.getInstructions())
                .dueDate(assignment.getDueDate() != null ? assignment.getDueDate().toString() : null)
                .maxScore(assignment.getMaxScore())
                .status(assignment.getStatus() != null ? assignment.getStatus().name() : null)
                .build();
    }

    /**
     * Access check for unpublished or private courses.
     * PUBLIC + APPROVED → accessible to everyone (including anonymous for browsing).
     * PRIVATE or non-APPROVED → only accessible to: owner, enrolled student, ADMIN,
     * or ORG_ADMIN within the same organization as the course owner.
     */
    private void verifyCourseAccess(Course course, UserJpaEntity currentUser) {
        boolean isPublicAndApproved = course.getVisibility() == Course.Visibility.PUBLIC
                && course.getStatus() == Course.CourseStatus.APPROVED;
        if (isPublicAndApproved) return;

        // Non-public or non-approved: require authentication
        if (currentUser == null) {
            throw new org.springframework.security.access.AccessDeniedException("Khóa học này yêu cầu đăng nhập");
        }

        // System admin can access any course.
        if (isSystemAdminRole(currentUser)) return;

        // ORG_ADMIN can access courses owned by teachers in the same organization.
        if (hasOrgScopedCourseAccess(course, currentUser)) return;

        // Course owner (teacher) can always access their own course
        if (course.getTeacherId().equals(currentUser.getId())) return;

        // Enrolled student can access
        boolean isEnrolled = enrollmentJpaRepository
                .findByStudentIdAndCourseId(currentUser.getId(), course.getId())
                .isPresent();
        if (isEnrolled) return;

        throw new org.springframework.security.access.AccessDeniedException("Bạn không có quyền truy cập khóa học này");
    }

    private void verifyCourseOwnership(UUID courseId, UserJpaEntity user) {
        if (isSystemAdminRole(user)) return;
        var course = courseRepository.findById(courseId)
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Khóa học", courseId));
        if (hasOrgScopedCourseAccess(course, user)) return;
        if (!course.getTeacherId().equals(user.getId())
                && !classTeacherJpaRepository.existsByTeacherIdAndCourseId(user.getId(), courseId)) {
            throw new org.springframework.security.access.AccessDeniedException("Bạn không có quyền truy cập khóa học này");
        }
    }

    // === Response DTOs ===

    @lombok.Builder
    @lombok.Data
    public static class CourseSummaryResponse {
        private String id;
        private String code;
        private String title;
        private String description;
        private String thumbnailUrl;
        private String status;
        private String teacherName;
        private String createdAt;
        private String categoryName;
        private String deliveryMode;
        private String priceType;
        private java.math.BigDecimal price;
        private java.math.BigDecimal salePrice;
        private Boolean allowOfflineDownload;
        private Integer enrolledCount;
        private Integer chapterCount;
    }

    @lombok.Builder
    @lombok.Data
    public static class CourseDetailResponse {
        private String id;
        private String title;
        private String description;
        private String thumbnailUrl;
        private String status;
        private String reviewState;
        private String draftChangeStatus;
        private String pendingReleaseNotes;
        private String code;
        private String teacherId;
        private String teacherName;
        private Integer enrolledCount;
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
        private String introVideoAssetId;
        private String introVideoProcessingStatus;
        private String introVideoSourceKind;
        private String introVideoStreamVideoUid;
        private List<Map<String, Object>> introVideoAvailableOfflineProfiles;
        private Integer credits;
        // Visibility & Pricing
        private String visibility;
        private String priceType;
        private java.math.BigDecimal price;
        private java.math.BigDecimal salePrice;
        private Boolean allowOfflineDownload;
        private Integer contentVersion;
        private String publicationId;
        private Integer publicationNumber;
        private String versionMode;
        private Boolean updateAvailable;
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
        private String lessonType;
        private Integer durationMinutes;
        private Integer orderIndex;
        private Boolean isFree;
        private Boolean locked;
        private String quizType;
        private Boolean countsTowardCertificate;
        private Boolean quizAllowOffline;
        private Integer quizTimeLimit;
        private Integer quizPassingScore;
        private Integer quizMaxScore;
        private Integer quizMaxAttempts;
        private AssignmentInfoResponse assignment;
        private List<SectionResponse> sections;
        private String videoUrl;
        private String streamVideoUid;
    }

    @lombok.Builder
    @lombok.Data
    public static class SectionResponse {
        private String id;
        private String title;
        private String type;
        private String content;
        private Map<String, Object> structuredContent;
        private String videoAssetId;
        private String videoProcessingStatus;
        private String videoSourceKind;
        private String videoUrl;
        private String videoType;
        private String streamVideoUid;
        private String fileUrl;
        private String previewPdfUrl;
        private String previewStatus;
        private Integer duration; // seconds
        private Integer orderIndex;
        private Boolean isRequired;
        private List<Map<String, Object>> availableOfflineProfiles;
        private Map<String, Object> quizData;
        private Map<String, Object> interactiveVideoSpec;
        private Map<String, Object> simulationData;
    }

    @lombok.Builder
    @lombok.Data
    public static class LessonDetailResponse {
        private String id;
        private String title;
        private String description;
        private String type;
        private String lessonType;
        private Integer durationMinutes;
        private Integer orderIndex;
        private String content;
        private String videoUrl;
        private String streamVideoUid;
        private String quizType;
        private Boolean countsTowardCertificate;
        private Boolean quizAllowOffline;
        private Integer quizTimeLimit;
        private Integer quizPassingScore;
        private Integer quizMaxScore;
        private Integer quizMaxAttempts;
        private AssignmentInfoResponse assignment;
        private String sectionId;
        private String sectionTitle;
        private String courseId;
        private String courseTitle;
        private Boolean isPreview;
        private Boolean locked;
        private List<SectionResponse> sections;
    }

    @lombok.Builder
    @lombok.Data
    public static class AssignmentInfoResponse {
        private String id;
        private String title;
        private String description;
        private String instructions;
        private String dueDate;
        private java.math.BigDecimal maxScore;
        private String status;
    }
}

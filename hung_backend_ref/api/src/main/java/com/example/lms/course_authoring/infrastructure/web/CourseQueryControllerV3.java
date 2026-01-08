package com.example.lms.course_authoring.infrastructure.web;

import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.model.Chapter;
import com.example.lms.course_authoring.domain.model.Lesson;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.JpaLessonRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaLearningClassRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * V3 Controller for Course queries.
 * Provides read-only endpoints for listing and viewing courses.
 */
@Tag(name = "Course Query V3", description = "Course query endpoints")
@RestController
@RequestMapping("/api/v3/courses")
@RequiredArgsConstructor
public class CourseQueryControllerV3 {

    private final JpaCourseRepository courseRepository;
    private final JpaLessonRepository lessonRepository;
    private final JpaLearningClassRepository learningClassRepository;
    private final JpaEnrollmentRepository enrollmentRepository;
    private final com.example.lms.course_authoring.infrastructure.persistence.repository.ChapterJpaRepository chapterRepository;

    @Operation(summary = "Get all published courses")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<CourseSummaryResponse>>> getPublicCourses(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String search
    ) {
        PageRequest pageable = PageRequest.of(Math.max(0, page - 1), limit, Sort.by("createdAt").descending());
        
        Page<Course> courses;
        if (search != null && !search.isBlank()) {
            courses = courseRepository.findByStatusAndTitleContaining(Course.CourseStatus.APPROVED, search, pageable);
        } else {
            courses = courseRepository.findByStatus(Course.CourseStatus.APPROVED, pageable);
        }
        
        Page<CourseSummaryResponse> response = courses.map(this::toSummary);
        return ResponseEntity.ok(ApiResponse.success(response, "Courses loaded"));
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
                .map(course -> ResponseEntity.ok(ApiResponse.success(toDetail(course), "Course loaded")))
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Get course content (chapters and lessons)")
    @GetMapping("/{courseId}/content")
    public ResponseEntity<ApiResponse<List<ChapterResponse>>> getCourseContent(
            @PathVariable UUID courseId
    ) {
        try {
            // With Set instead of List, JOIN FETCH works without MultipleBagFetchException
            return courseRepository.findByIdWithContent(courseId)
                    .map(course -> {
                        List<ChapterResponse> chapters = new ArrayList<>();
                        
                        // Convert Set to List and sort by orderIndex
                        List<Chapter> sortedChapters = new ArrayList<>(course.getChapters());
                        sortedChapters.sort(Comparator.comparingInt(c -> c.getOrderIndex() != null ? c.getOrderIndex() : 0));
                        
                        if (sortedChapters.isEmpty()) {
                            return ResponseEntity.ok(ApiResponse.success(chapters, "Course has no content"));
                        }
                        
                        for (Chapter ch : sortedChapters) {
                            List<LessonResponse> lessonResponses = new ArrayList<>();
                            
                            // Convert Set to List and sort by orderIndex  
                            List<Lesson> sortedLessons = new ArrayList<>(ch.getLessons());
                            sortedLessons.sort(Comparator.comparingInt(l -> l.getOrderIndex() != null ? l.getOrderIndex() : 0));
                            
                            for (Lesson l : sortedLessons) {
                                List<SectionResponse> sectionResponses = new ArrayList<>();
                                if (l.getContentBlocks() != null) {
                                    for (com.example.lms.shared.domain.model.ContentBlock block : l.getContentBlocks()) {
                                         java.util.Map<String, Object> data = block.getData() != null ? block.getData() : new java.util.HashMap<>();
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

                                lessonResponses.add(LessonResponse.builder()
                                        .id(l.getId().toString())
                                        .title(l.getTitle())
                                        .description(l.getDescription())
                                        .type(l.getLessonType() != null ? l.getLessonType().name() : "LECTURE")
                                        .durationMinutes(l.getDurationMinutes())
                                        .orderIndex(l.getOrderIndex())
                                        .isFree(l.getIsPreview() != null && l.getIsPreview())
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
                        
                        return ResponseEntity.ok(ApiResponse.success(chapters, "Course content loaded"));
                    })
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            System.err.println("❌ Error loading course content: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.ok(ApiResponse.success(new ArrayList<>(), "Error loading content: " + e.getMessage()));
        }
    }

    @Operation(summary = "Get instructors for a course")
    @GetMapping("/{courseId}/instructors")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<List<InstructorResponse>>> getCourseInstructors(
            @PathVariable UUID courseId
    ) {
        // Return course owner/teacher as instructor for now
        return courseRepository.findById(courseId)
                .map(course -> {
                    InstructorResponse instructor = InstructorResponse.builder()
                            .id(java.util.UUID.randomUUID().toString())
                            .userId(course.getTeacherId().toString())
                            .userName("Giảng viên")
                            .userEmail("teacher@lms.edu.vn")
                            .role("OWNER")
                            .status("ACTIVE")
                            .canManage(true)
                            .canViewPerformance(true)
                            .isVisible(true)
                            .canGradeAssignments(true)
                            .revenueSharePercent(100)
                            .invitedAt(course.getCreatedAt() != null ? course.getCreatedAt().toString() : null)
                            .build();
                    return ResponseEntity.ok(ApiResponse.success(List.of(instructor), "Instructors loaded"));
                })
                .orElse(ResponseEntity.ok(ApiResponse.success(List.of(), "Course not found")));
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
            @PathVariable UUID courseId
    ) {
        List<LearningClass> classes = learningClassRepository.findByCourseId(courseId);
        List<ClassInfoResponse> response = classes.stream()
                .map(this::toClassInfoResponse)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(response, "Classes loaded"));
    }

    private final com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository userRepository;

    @Operation(summary = "Search classes for a course")
    @GetMapping("/{courseId}/classes/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<PageResponse<ClassInfoResponse>>> searchCourseClasses(
            @PathVariable UUID courseId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String semester,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        // Get all classes for the course
        List<LearningClass> allClasses = learningClassRepository.findByCourseId(courseId);
        
        // Filter
        List<LearningClass> filteredClasses = allClasses.stream()
                .filter(c -> {
                    if (search != null && !search.isBlank()) {
                        String s = search.toLowerCase();
                        return (c.getName() != null && c.getName().toLowerCase().contains(s)) ||
                               (c.getCode() != null && c.getCode().toLowerCase().contains(s));
                    }
                    return true;
                })
                .filter(c -> {
                    if (status != null && !status.isBlank()) {
                        return c.getStatus() != null && c.getStatus().name().equalsIgnoreCase(status);
                    }
                    return true;
                })
                .toList(); // Collect LearningClass first

        // Manual pagination
        int total = filteredClasses.size();
        int fromIndex = Math.min(page * size, total);
        int toIndex = Math.min(fromIndex + size, total);
        List<LearningClass> pageContentClasses = filteredClasses.subList(fromIndex, toIndex);
        
        // Map ONLY the page content to DTOs (prevents N+1 on entire dataset)
        List<ClassInfoResponse> pageContent = pageContentClasses.stream()
                .map(this::toClassInfoResponse)
                .toList();

        int totalPages = (int) Math.ceil((double) total / size);
        
        PageResponse<ClassInfoResponse> pageResponse = PageResponse.<ClassInfoResponse>builder()
                .content(pageContent)
                .totalElements(total)
                .totalPages(totalPages)
                .number(page)
                .size(size)
                .build();
                
        return ResponseEntity.ok(ApiResponse.success(pageResponse, "Classes search completed"));
    }
    
    private ClassInfoResponse toClassInfoResponse(LearningClass lc) {
        // Count actual enrollments for this class
        long studentCount = enrollmentRepository.countByClassId(lc.getId());
        
        String teacherName = null;
        if (lc.getTeacherId() != null) {
            teacherName = userRepository.findById(lc.getTeacherId())
                    .map(UserJpaEntity::getFullName)
                    .orElse("Unknown Teacher");
        }

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
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class PageResponse<T> {
        private List<T> content;
        private int totalElements;
        private int totalPages;
        private int number;
        private int size;
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
    @GetMapping("/sections/lessons/{lessonId}")
    public ResponseEntity<ApiResponse<LessonDetailResponse>> getLessonById(
            @PathVariable UUID lessonId
    ) {
        try {
            // SOTA: O(1) indexed query instead of O(n³) nested loops
            return lessonRepository.findByIdWithContext(lessonId)
                    .map(lesson -> {
                        Chapter chapter = lesson.getChapter();
                        Course course = chapter.getCourse();
                        
                        LessonDetailResponse response = LessonDetailResponse.builder()
                                .id(lesson.getId().toString())
                                .title(lesson.getTitle())
                                .description(lesson.getDescription())
                                .lessonType(lesson.getLessonType() != null ? lesson.getLessonType().name() : "LECTURE")
                                .durationMinutes(lesson.getDurationMinutes())
                                .orderIndex(lesson.getOrderIndex())
                                .content(lesson.getContent())
                                .videoUrl(lesson.getVideoUrl())
                                .sectionId(chapter.getId().toString())
                                .sectionTitle(chapter.getTitle())
                                .courseId(course.getId().toString())
                                .courseTitle(course.getTitle())
                                .isPreview(lesson.getIsPreview() != null && lesson.getIsPreview())
                                .build();
                        return ResponseEntity.ok(ApiResponse.success(response, "Lesson loaded"));
                    })
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            System.err.println("❌ Error loading lesson: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.ok(ApiResponse.success(null, "Error loading lesson: " + e.getMessage()));
        }
    }

    @Operation(summary = "Get lessons by chapter ID")
    @GetMapping("/chapters/{chapterId}/lessons")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<List<LessonResponse>>> getChapterLessons(
            @PathVariable UUID chapterId
    ) {
        List<Lesson> lessons = lessonRepository.findByChapterId(chapterId);
        
        List<LessonResponse> response = lessons.stream()
                .map(l -> LessonResponse.builder()
                        .id(l.getId().toString())
                        .title(l.getTitle())
                        .description(l.getDescription())
                        .type(l.getLessonType() != null ? l.getLessonType().name() : "LECTURE")
                        .durationMinutes(l.getDurationMinutes())
                        .orderIndex(l.getOrderIndex())
                        .isFree(l.getIsPreview() != null && l.getIsPreview())
                        .build())
                .toList();

        return ResponseEntity.ok(ApiResponse.success(response, "Lessons loaded"));
    }

    @Operation(summary = "Get chapter details by ID")
    @GetMapping("/chapters/{chapterId}")
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
                            .lessons(new ArrayList<>()) // Details usually don't need full lesson list or lazy load
                            .build();
                    return ResponseEntity.ok(ApiResponse.success(response, "Chapter loaded"));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // === Mapping methods ===
    
    private CourseSummaryResponse toSummary(Course course) {
        return CourseSummaryResponse.builder()
                .id(course.getId().toString())
                .title(course.getTitle())
                .description(course.getDescription())
                .thumbnailUrl(null) // Course doesn't have thumbnailUrl in domain model
                .status(course.getStatus().name().toLowerCase())
                .teacherName("Giảng viên") // TODO: Fetch from User service
                .createdAt(course.getCreatedAt() != null ? course.getCreatedAt().toString() : null)
                .build();
    }

    private CourseDetailResponse toDetail(Course course) {
        return CourseDetailResponse.builder()
                .id(course.getId().toString())
                .title(course.getTitle())
                .description(course.getDescription())
                .thumbnailUrl(null)
                .status(course.getStatus().name().toLowerCase())
                .code(course.getCode() != null ? course.getCode().getValue() : null)
                .teacherId(course.getTeacherId() != null ? course.getTeacherId().toString() : null)
                .teacherName("Giảng viên")
                .chapterCount(course.getChapters() != null ? course.getChapters().size() : 0)
                .createdAt(course.getCreatedAt() != null ? course.getCreatedAt().toString() : null)
                .updatedAt(course.getUpdatedAt() != null ? course.getUpdatedAt().toString() : null)
                .build();
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
    }
}

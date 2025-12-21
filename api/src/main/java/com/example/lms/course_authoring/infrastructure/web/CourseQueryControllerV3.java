package com.example.lms.course_authoring.infrastructure.web;

import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.model.Chapter;
import com.example.lms.course_authoring.domain.model.Lesson;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.JpaLessonRepository;
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

    @Operation(summary = "Get teacher's own courses")
    @GetMapping("/my-courses")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Page<CourseSummaryResponse>>> getMyCourses(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit
    ) {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        
        if (!(principal instanceof UserJpaEntity)) {
            return ResponseEntity.ok(ApiResponse.success(
                Page.empty(), "User not authenticated properly"
            ));
        }
        
        UserJpaEntity currentUser = (UserJpaEntity) principal;
        UUID teacherId = currentUser.getId();
        PageRequest pageable = PageRequest.of(Math.max(0, page - 1), limit, Sort.by("createdAt").descending());
        
        Page<Course> courses = courseRepository.findByTeacherId(teacherId, pageable);
        Page<CourseSummaryResponse> response = courses.map(this::toSummary);
        
        return ResponseEntity.ok(ApiResponse.success(response, "My courses loaded"));
    }

    @Operation(summary = "Get course details by ID")
    @GetMapping("/{courseId}")
    public ResponseEntity<ApiResponse<CourseDetailResponse>> getCourseById(
            @PathVariable UUID courseId
    ) {
        return courseRepository.findById(courseId)
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
                                lessonResponses.add(LessonResponse.builder()
                                        .id(l.getId().toString())
                                        .title(l.getTitle())
                                        .description(l.getDescription())
                                        .type(l.getLessonType() != null ? l.getLessonType().name() : "LECTURE")
                                        .durationMinutes(l.getDurationMinutes())
                                        .orderIndex(l.getOrderIndex())
                                        .isFree(l.getIsPreview() != null && l.getIsPreview())
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

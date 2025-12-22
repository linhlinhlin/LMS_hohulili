package com.example.lms.course_authoring.infrastructure.web;

import com.example.lms.course_authoring.application.usecase.CreateChapterUseCaseV3;
import com.example.lms.course_authoring.application.usecase.CreateLessonUseCaseV3;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * V3 Controller for Course Authoring.
 * Uses pure DDD patterns with command objects.
 */
@Tag(name = "Course Authoring V3", description = "DDD-based course authoring endpoints")
@RestController
@RequestMapping("/api/v3/courses")
@RequiredArgsConstructor
public class CourseAuthoringControllerV3 {

    private final CreateChapterUseCaseV3 createChapterUseCase;
    private final CreateLessonUseCaseV3 createLessonUseCase;

    @Operation(summary = "Create a new chapter")
    @PostMapping("/{courseId}/chapters")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<UUID> createChapter(
            @PathVariable UUID courseId,
            @RequestBody CreateChapterRequest request
    ) {
        var command = new CreateChapterUseCaseV3.CreateChapterCommand(
            courseId,
            request.title(),
            request.description(),
            request.orderIndex()
        );
        UUID chapterId = createChapterUseCase.execute(command);
        return ResponseEntity.ok(chapterId);
    }

    @Operation(summary = "Create a new lesson in a chapter")
    @PostMapping("/chapters/{chapterId}/lessons")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<UUID> createLesson(
            @PathVariable UUID chapterId,
            @RequestBody CreateLessonRequest request
    ) {
        var command = new CreateLessonUseCaseV3.CreateLessonCommand(
            chapterId,
            request.title(),
            request.description(),
            request.type(),
            request.videoUrl(),
            request.durationMinutes(),
            request.orderIndex(),
            request.isFree()
        );
        UUID lessonId = createLessonUseCase.execute(command);
        return ResponseEntity.ok(lessonId);
    }

    // Request DTOs
    public record CreateChapterRequest(
        String title,
        String description,
        Integer orderIndex
    ) {}

    public record CreateLessonRequest(
        String title,
        String description,
        String type,
        String videoUrl,
        Integer durationMinutes,
        Integer orderIndex,
        Boolean isFree
    ) {}
}

// New controller for categories and instructors
@Tag(name = "Course Authoring Support V3", description = "Support endpoints for course authoring")
@RestController
@RequestMapping("/api/v3")
@RequiredArgsConstructor
class CourseAuthoringSupportControllerV3 {

    @Operation(summary = "Get all course categories")
    @GetMapping("/categories")
    @org.springframework.cache.annotation.Cacheable(value = "categories")  // SOTA: Cache for 10 min
    public ResponseEntity<ApiResponse<java.util.List<CategoryDTO>>> getCategories() {
        // Return default categories for course editor
        var categories = java.util.List.of(
            new CategoryDTO("cat-1", "MARITIME", "Hàng hải"),
            new CategoryDTO("cat-2", "ENGINEERING", "Kỹ thuật"),
            new CategoryDTO("cat-3", "SAFETY", "An toàn"),
            new CategoryDTO("cat-4", "MANAGEMENT", "Quản lý"),
            new CategoryDTO("cat-5", "OTHER", "Khác")
        );
        return ResponseEntity.ok(ApiResponse.success(categories, "Categories loaded"));
    }

    @Operation(summary = "Get all instructors")
    @GetMapping("/users/instructors")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @org.springframework.cache.annotation.Cacheable(value = "instructors")  // SOTA: Cache for 10 min
    public ResponseEntity<ApiResponse<java.util.List<InstructorDTO>>> getInstructors() {
        // TODO: Fetch from UserRepository where role = TEACHER
        // For now, return empty list - can be enhanced
        return ResponseEntity.ok(ApiResponse.success(java.util.List.of(), "Instructors loaded"));
    }

    // DTOs
    public record CategoryDTO(String id, String code, String name) {}
    public record InstructorDTO(String id, String name, String email) {}
}

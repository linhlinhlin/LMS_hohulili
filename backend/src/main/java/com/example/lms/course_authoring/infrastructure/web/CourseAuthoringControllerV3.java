package com.example.lms.course_authoring.infrastructure.web;

import com.example.lms.course_authoring.application.usecase.CreateChapterUseCaseV3;
import com.example.lms.course_authoring.application.usecase.CreateLessonUseCaseV3;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.course_authoring.application.usecase.UpdateChapterUseCase;
import com.example.lms.course_authoring.application.usecase.DeleteChapterUseCase;
import com.example.lms.course_authoring.application.usecase.UpdateLessonUseCase;
import com.example.lms.course_authoring.application.usecase.DeleteLessonUseCase;
import com.example.lms.course_authoring.application.dto.UpdateChapterCommand;
import com.example.lms.course_authoring.application.dto.UpdateLessonCommand;
import com.example.lms.course_authoring.application.dto.ChapterResponse;
import com.example.lms.course_authoring.application.dto.LessonResponse;
import com.example.lms.course_authoring.application.dto.UpdateCourseCommand;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.extern.slf4j.Slf4j;

import java.util.UUID;

/**
 * V3 Controller for Course Authoring.
 * Uses pure DDD patterns with command objects.
 */
@Slf4j
@Tag(name = "Course Authoring V3", description = "DDD-based course authoring endpoints")
@RestController
@RequestMapping("/api/v3/courses")
@RequiredArgsConstructor
public class CourseAuthoringControllerV3 {

    private final CreateChapterUseCaseV3 createChapterUseCase;
    private final CreateLessonUseCaseV3 createLessonUseCase;
    private final UpdateChapterUseCase updateChapterUseCase;
    private final DeleteChapterUseCase deleteChapterUseCase;
    private final UpdateLessonUseCase updateLessonUseCase;
    private final DeleteLessonUseCase deleteLessonUseCase;
    private final com.example.lms.course_authoring.application.usecase.ManageContentBlockUseCaseV3 manageContentBlockUseCase;
    private final com.example.lms.course_authoring.application.usecase.UpdateCourseUseCase updateCourseUseCase;

    @Operation(summary = "Create a new chapter")
    @PostMapping("/{courseId}/chapters")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<UUID>> createChapter(
            @PathVariable UUID courseId,
            @Valid @RequestBody CreateChapterRequest request
    ) {
        var command = new CreateChapterUseCaseV3.CreateChapterCommand(
            courseId,
            request.title(),
            request.description(),
            request.orderIndex()
        );
        UUID chapterId = createChapterUseCase.execute(command);
        return ResponseEntity.ok(ApiResponse.success(chapterId, "Chapter created successfully"));
    }

    @Operation(summary = "Create a new lesson in a chapter")
    @PostMapping("/chapters/{chapterId}/lessons")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<UUID>> createLesson(
            @PathVariable UUID chapterId,
            @Valid @RequestBody CreateLessonRequest request
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
        return ResponseEntity.ok(ApiResponse.success(lessonId, "Lesson created successfully"));
    }

    @Operation(summary = "Update a chapter")
    @PutMapping("/chapters/{chapterId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<ChapterResponse>> updateChapter(
            @PathVariable UUID chapterId,
            @Valid @RequestBody UpdateChapterRequest request,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        var command = new UpdateChapterCommand(
            request.courseId(),
            chapterId,
            user.getId(),
            request.title(),
            request.description(),
            user.getRole() == com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity.UserRole.ADMIN
        );
        ChapterResponse response = updateChapterUseCase.execute(command);
        return ResponseEntity.ok(ApiResponse.success(response, "Chapter updated successfully"));
    }

    @Operation(summary = "Delete a chapter")
    @DeleteMapping("/chapters/{chapterId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Void>> deleteChapter(
            @PathVariable UUID chapterId,
            @RequestParam UUID courseId,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        boolean isAdmin = user.getRole() == com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity.UserRole.ADMIN;
        deleteChapterUseCase.execute(courseId, chapterId, user.getId(), isAdmin);
        return ResponseEntity.ok(ApiResponse.success(null, "Chapter deleted successfully"));
    }

    @Operation(summary = "Update a lesson")
    @PutMapping("/lessons/{lessonId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<LessonResponse>> updateLesson(
            @PathVariable UUID lessonId,
            @Valid @RequestBody UpdateLessonRequest request,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        var command = new UpdateLessonCommand(
            request.courseId(),
            request.chapterId(),
            lessonId,
            user.getId(),
            request.title(),
            request.description(),
            request.lessonType(),
            request.content(),
            request.videoUrl(),
            request.durationMinutes(),
            request.isRequired(),
            request.isPreview(),
            user.getRole() == com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity.UserRole.ADMIN
        );
        LessonResponse response = updateLessonUseCase.execute(command);
        return ResponseEntity.ok(ApiResponse.success(response, "Lesson updated successfully"));
    }

    @Operation(summary = "Delete a lesson")
    @DeleteMapping("/lessons/{lessonId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Void>> deleteLesson(
            @PathVariable UUID lessonId,
            @RequestParam UUID courseId,
            @RequestParam(required = false) UUID chapterId, // Optional - will scan chapters if null
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        boolean isAdmin = user.getRole() == com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity.UserRole.ADMIN;
        deleteLessonUseCase.execute(courseId, chapterId, lessonId, user.getId(), isAdmin);
        return ResponseEntity.ok(ApiResponse.success(null, "Lesson deleted successfully"));
    }

    // ================================================================================================
    // Section / ContentBlock Endpoints (Level 4 Hierarchy - Mapped to ContentBlock in Lesson)
    // ================================================================================================


    @Operation(summary = "Add a section (content block) to a lesson")
    @PostMapping(value = "/lessons/{lessonId}/sections", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<com.example.lms.shared.domain.model.ContentBlock>> addSection(
            @PathVariable UUID lessonId,
            @RequestPart("data") java.util.Map<String, Object> payload,
            @RequestPart(value = "file", required = false) org.springframework.web.multipart.MultipartFile file
    ) {
        if (file != null && !file.isEmpty()) {
            log.debug("Received file: {}", file.getOriginalFilename());
        }

        String type = (String) payload.getOrDefault("type", "TEXT");
        log.debug("Processing addSection for lesson: {}, type: {}", lessonId, type);
        com.example.lms.shared.domain.model.ContentBlock block = manageContentBlockUseCase.addBlock(lessonId, type, payload);
        return ResponseEntity.ok(ApiResponse.success(block, "Section created successfully"));
    }

    @Operation(summary = "Update a section (content block)")
    @PutMapping(value = "/lessons/{lessonId}/sections/{sectionId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<com.example.lms.shared.domain.model.ContentBlock>> updateSection(
            @PathVariable UUID lessonId,
            @PathVariable String sectionId,
            @RequestPart("data") java.util.Map<String, Object> payload,
            @RequestPart(value = "file", required = false) org.springframework.web.multipart.MultipartFile file
    ) {
        if (file != null && !file.isEmpty()) {
            log.debug("Received file for update: {}", file.getOriginalFilename());
        }

        com.example.lms.shared.domain.model.ContentBlock block = manageContentBlockUseCase.updateBlock(lessonId, sectionId, payload);
        return ResponseEntity.ok(ApiResponse.success(block, "Section updated successfully"));
    }

    @Operation(summary = "Delete a section (content block)")
    @DeleteMapping("/lessons/{lessonId}/sections/{sectionId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Void>> deleteSection(
            @PathVariable UUID lessonId,
            @PathVariable String sectionId
    ) {
        manageContentBlockUseCase.deleteBlock(lessonId, sectionId);
        return ResponseEntity.ok(ApiResponse.success(null, "Section deleted successfully"));
    }

    @Operation(summary = "Update course details")
    @PutMapping("/{courseId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<com.example.lms.course_authoring.application.dto.CourseResponse>> updateCourse(
            @PathVariable UUID courseId,
            @Valid @RequestBody UpdateCourseRequest request,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        var command = new com.example.lms.course_authoring.application.dto.UpdateCourseCommand(
            courseId,
            user.getId(),
            request.title(),
            request.description(),
            request.categoryId(),
            request.tags(),
            request.welcomeMessage(),
            request.courseInformation(),
            request.benefits(),
            request.introVideoUrl(),
            request.credits(),
            request.visibility(),
            request.priceType(),
            request.price(),
            request.salePrice(),
            user.getRole() == com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity.UserRole.ADMIN
        );
        com.example.lms.course_authoring.application.dto.CourseResponse response = updateCourseUseCase.execute(command);
        return ResponseEntity.ok(ApiResponse.success(response, "Course updated successfully"));
    }
    
    // Request DTOs
    public record CreateChapterRequest(
        @NotBlank(message = "Title is required")
        String title,
        String description,
        Integer orderIndex
    ) {}

    public record CreateLessonRequest(
        @NotBlank(message = "Title is required")
        String title,
        String description,
        String type,
        String videoUrl,
        Integer durationMinutes,
        Integer orderIndex,
        Boolean isFree
    ) {}

    public record UpdateChapterRequest(
        UUID courseId,
        String title,
        String description,
        Integer orderIndex
    ) {}

    public record UpdateLessonRequest(
        UUID courseId,
        UUID chapterId,
        String title,
        String description,
        String lessonType,
        String content,
        String videoUrl,
        Integer durationMinutes,
        Boolean isRequired,
        Boolean isPreview
    ) {}

    public record UpdateCourseRequest(
        String title,
        String description,
        UUID categoryId,
        java.util.Set<String> tags,
        String welcomeMessage,
        String courseInformation,
        String benefits,
        String introVideoUrl,
        Integer credits,
        String visibility,
        String priceType,
        java.math.BigDecimal price,
        java.math.BigDecimal salePrice
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

    // NOTE: getInstructors is now handled by UserControllerV3 at /api/v3/users/instructors

    // DTOs
    public record CategoryDTO(String id, String code, String name) {}
}

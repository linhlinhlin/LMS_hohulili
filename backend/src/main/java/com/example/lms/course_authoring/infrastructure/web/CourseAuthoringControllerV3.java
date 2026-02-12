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
    private final com.example.lms.course_authoring.infrastructure.persistence.repository.ChapterJpaRepository chapterJpaRepository;
    private final com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository lessonJpaRepository;
    private final com.example.lms.course_authoring.domain.repository.CourseRepository courseRepository;

    @Operation(summary = "Create a new chapter")
    @PostMapping("/{courseId}/chapters")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<UUID>> createChapter(
            @PathVariable UUID courseId,
            @Valid @RequestBody CreateChapterRequest request,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        boolean isAdmin = isAdminRole(user);
        var command = new CreateChapterUseCaseV3.CreateChapterCommand(
            courseId,
            request.title(),
            request.description(),
            request.orderIndex(),
            user.getId(),
            isAdmin
        );
        UUID chapterId = createChapterUseCase.execute(command);
        return ResponseEntity.ok(ApiResponse.success(chapterId, "Chapter created successfully"));
    }

    @Operation(summary = "Create a new lesson in a chapter")
    @PostMapping("/chapters/{chapterId}/lessons")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
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
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
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
            isAdminRole(user)
        );
        ChapterResponse response = updateChapterUseCase.execute(command);
        return ResponseEntity.ok(ApiResponse.success(response, "Chapter updated successfully"));
    }

    @Operation(summary = "Delete a chapter")
    @DeleteMapping("/chapters/{chapterId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Void>> deleteChapter(
            @PathVariable UUID chapterId,
            @RequestParam UUID courseId,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        boolean isAdmin = isAdminRole(user);
        deleteChapterUseCase.execute(courseId, chapterId, user.getId(), isAdmin);
        return ResponseEntity.ok(ApiResponse.success(null, "Chapter deleted successfully"));
    }

    @Operation(summary = "Update a lesson")
    @PutMapping("/lessons/{lessonId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
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
            isAdminRole(user)
        );
        LessonResponse response = updateLessonUseCase.execute(command);
        return ResponseEntity.ok(ApiResponse.success(response, "Lesson updated successfully"));
    }

    @Operation(summary = "Delete a lesson")
    @DeleteMapping("/lessons/{lessonId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Void>> deleteLesson(
            @PathVariable UUID lessonId,
            @RequestParam UUID courseId,
            @RequestParam(required = false) UUID chapterId, // Optional - will scan chapters if null
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        boolean isAdmin = isAdminRole(user);
        deleteLessonUseCase.execute(courseId, chapterId, lessonId, user.getId(), isAdmin);
        return ResponseEntity.ok(ApiResponse.success(null, "Lesson deleted successfully"));
    }

    // ================================================================================================
    // Reorder Endpoints
    // ================================================================================================

    @Operation(summary = "Reorder chapters in a course")
    @PatchMapping("/chapters/reorder")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<ApiResponse<Void>> reorderChapters(
            @Valid @RequestBody ReorderChaptersRequest request,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        try {
            UUID courseId = UUID.fromString(request.courseId());
            verifyOwnership(courseId, user);
            var chapters = chapterJpaRepository.findByCourseIdOrderByOrderIndex(courseId);
            java.util.Map<UUID, com.example.lms.course_authoring.infrastructure.persistence.entity.ChapterJpaEntity> map = new java.util.HashMap<>();
            for (var ch : chapters) map.put(ch.getId(), ch);
            for (int i = 0; i < request.orderedIds().size(); i++) {
                var ch = map.get(UUID.fromString(request.orderedIds().get(i)));
                if (ch != null) ch.setOrderIndex(i);
            }
            chapterJpaRepository.saveAll(chapters);
            return ResponseEntity.ok(ApiResponse.success(null, "Chapters reordered"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid UUID format"));
        }
    }

    @Operation(summary = "Reorder lessons in a chapter")
    @PatchMapping("/lessons/reorder")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<ApiResponse<Void>> reorderLessons(
            @Valid @RequestBody ReorderLessonsRequest request,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        try {
            UUID chapterId = UUID.fromString(request.chapterId());
            verifyOwnershipByChapter(chapterId, user);
            var lessons = lessonJpaRepository.findByChapterIdOrderByOrderIndex(chapterId);
            java.util.Map<UUID, com.example.lms.course_authoring.infrastructure.persistence.entity.LessonJpaEntity> map = new java.util.HashMap<>();
            for (var l : lessons) map.put(l.getId(), l);
            for (int i = 0; i < request.orderedIds().size(); i++) {
                var l = map.get(UUID.fromString(request.orderedIds().get(i)));
                if (l != null) l.setOrderIndex(i);
            }
            lessonJpaRepository.saveAll(lessons);
            return ResponseEntity.ok(ApiResponse.success(null, "Lessons reordered"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid UUID format"));
        }
    }

    @Operation(summary = "Reorder sections (content blocks) in a lesson")
    @PatchMapping("/sections/reorder")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Void>> reorderSections(
            @Valid @RequestBody ReorderSectionsRequest request,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        try {
            UUID lessonId = UUID.fromString(request.lessonId());
            verifyOwnershipByLesson(lessonId, user);
            var blocks = manageContentBlockUseCase.getBlocks(lessonId);
            java.util.Map<String, com.example.lms.shared.domain.model.ContentBlock> blockMap = new java.util.LinkedHashMap<>();
            for (var block : blocks) blockMap.put(block.getId(), block);
            java.util.List<com.example.lms.shared.domain.model.ContentBlock> reordered = new java.util.ArrayList<>();
            for (String id : request.orderedIds()) {
                var block = blockMap.get(id);
                if (block != null) reordered.add(block);
            }
            manageContentBlockUseCase.saveBlocks(lessonId, reordered);
            return ResponseEntity.ok(ApiResponse.success(null, "Sections reordered"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid UUID format"));
        }
    }

    // ================================================================================================
    // Section / ContentBlock Endpoints (Level 4 Hierarchy - Mapped to ContentBlock in Lesson)
    // ================================================================================================


    @Operation(summary = "Add a section (content block) to a lesson")
    @PostMapping(value = "/lessons/{lessonId}/sections", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<com.example.lms.shared.domain.model.ContentBlock>> addSection(
            @PathVariable UUID lessonId,
            @RequestPart("data") java.util.Map<String, Object> payload,
            @RequestPart(value = "file", required = false) org.springframework.web.multipart.MultipartFile file,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        if (file != null && !file.isEmpty()) {
            log.debug("Received file: {}", file.getOriginalFilename());
        }

        String type = (String) payload.getOrDefault("type", "TEXT");
        log.debug("Processing addSection for lesson: {}, type: {}", lessonId, type);
        boolean isAdmin = isAdminRole(user);
        com.example.lms.shared.domain.model.ContentBlock block = manageContentBlockUseCase.addBlock(lessonId, type, payload, user.getId(), isAdmin);
        return ResponseEntity.ok(ApiResponse.success(block, "Section created successfully"));
    }

    @Operation(summary = "Update a section (content block)")
    @PutMapping(value = "/lessons/{lessonId}/sections/{sectionId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<com.example.lms.shared.domain.model.ContentBlock>> updateSection(
            @PathVariable UUID lessonId,
            @PathVariable String sectionId,
            @RequestPart("data") java.util.Map<String, Object> payload,
            @RequestPart(value = "file", required = false) org.springframework.web.multipart.MultipartFile file,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        if (file != null && !file.isEmpty()) {
            log.debug("Received file for update: {}", file.getOriginalFilename());
        }

        boolean isAdmin = isAdminRole(user);
        com.example.lms.shared.domain.model.ContentBlock block = manageContentBlockUseCase.updateBlock(lessonId, sectionId, payload, user.getId(), isAdmin);
        return ResponseEntity.ok(ApiResponse.success(block, "Section updated successfully"));
    }

    @Operation(summary = "Delete a section (content block)")
    @DeleteMapping("/lessons/{lessonId}/sections/{sectionId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Void>> deleteSection(
            @PathVariable UUID lessonId,
            @PathVariable String sectionId,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        boolean isAdmin = isAdminRole(user);
        manageContentBlockUseCase.deleteBlock(lessonId, sectionId, user.getId(), isAdmin);
        return ResponseEntity.ok(ApiResponse.success(null, "Section deleted successfully"));
    }

    @Operation(summary = "Update course details")
    @PutMapping("/{courseId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORG_ADMIN', 'TEACHER')")
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
            request.thumbnailUrl(),
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
            request.deliveryMode(),
            isAdminRole(user)
        );
        com.example.lms.course_authoring.application.dto.CourseResponse response = updateCourseUseCase.execute(command);
        return ResponseEntity.ok(ApiResponse.success(response, "Course updated successfully"));
    }
    
    // --- Helpers ---

    private boolean isAdminRole(UserJpaEntity user) {
        return user.getRole() == UserJpaEntity.UserRole.ADMIN
            || user.getRole() == UserJpaEntity.UserRole.ORG_ADMIN;
    }

    private void verifyOwnership(UUID courseId, UserJpaEntity user) {
        if (isAdminRole(user)) return;
        var course = courseRepository.findById(courseId)
            .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Course", courseId));
        if (!course.getTeacherId().equals(user.getId())) {
            throw new org.springframework.security.access.AccessDeniedException("You do not own this course");
        }
    }

    private void verifyOwnershipByChapter(UUID chapterId, UserJpaEntity user) {
        if (isAdminRole(user)) return;
        var course = courseRepository.findByChapterId(chapterId)
            .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Course", chapterId));
        if (!course.getTeacherId().equals(user.getId())) {
            throw new org.springframework.security.access.AccessDeniedException("You do not own this course");
        }
    }

    private void verifyOwnershipByLesson(UUID lessonId, UserJpaEntity user) {
        if (isAdminRole(user)) return;
        var course = courseRepository.findByLessonId(lessonId)
            .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Course", lessonId));
        if (!course.getTeacherId().equals(user.getId())) {
            throw new org.springframework.security.access.AccessDeniedException("You do not own this course");
        }
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
        @jakarta.validation.constraints.Size(max = 255, message = "Title must not exceed 255 characters") String title,
        String description,
        String thumbnailUrl,
        UUID categoryId,
        java.util.Set<String> tags,
        String welcomeMessage,
        String courseInformation,
        String benefits,
        String introVideoUrl,
        @jakarta.validation.constraints.Min(value = 0, message = "Credits must be >= 0") @jakarta.validation.constraints.Max(value = 30, message = "Credits must be <= 30") Integer credits,
        String visibility,
        String priceType,
        @jakarta.validation.constraints.DecimalMin(value = "0", message = "Price must be >= 0") java.math.BigDecimal price,
        @jakarta.validation.constraints.DecimalMin(value = "0", message = "Sale price must be >= 0") java.math.BigDecimal salePrice,
        String deliveryMode
    ) {}

    public record ReorderChaptersRequest(
        @NotBlank(message = "Course ID is required") String courseId,
        @jakarta.validation.constraints.NotEmpty(message = "Ordered IDs required") java.util.List<String> orderedIds
    ) {}

    public record ReorderLessonsRequest(
        @NotBlank(message = "Course ID is required") String courseId,
        @NotBlank(message = "Chapter ID is required") String chapterId,
        @jakarta.validation.constraints.NotEmpty(message = "Ordered IDs required") java.util.List<String> orderedIds
    ) {}

    public record ReorderSectionsRequest(
        @NotBlank(message = "Lesson ID is required") String lessonId,
        @jakarta.validation.constraints.NotEmpty(message = "Ordered IDs required") java.util.List<String> orderedIds
    ) {}
}

// New controller for categories and instructors
@Tag(name = "Course Authoring Support V3", description = "Support endpoints for course authoring")
@RestController
@RequestMapping("/api/v3")
@RequiredArgsConstructor
class CourseAuthoringSupportControllerV3 {

    private final com.example.lms.course_authoring.infrastructure.persistence.repository.CategoryJpaRepository categoryJpaRepository;

    @Operation(summary = "Get all course categories")
    @GetMapping("/categories")
    @org.springframework.cache.annotation.Cacheable(value = "categories")
    public ResponseEntity<ApiResponse<java.util.List<CategoryDTO>>> getCategories() {
        var categories = categoryJpaRepository.findAll().stream()
            .map(c -> new CategoryDTO(c.getId().toString(), c.getCode(), c.getName(), c.getPrefix()))
            .toList();
        return ResponseEntity.ok(ApiResponse.success(categories, "Categories loaded"));
    }

    // NOTE: getInstructors is now handled by UserControllerV3 at /api/v3/users/instructors

    // DTOs
    public record CategoryDTO(String id, String code, String name, String prefix) {}
}

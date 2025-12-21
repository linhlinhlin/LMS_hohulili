package com.example.lms.course_authoring.infrastructure.web;

import com.example.lms.course_authoring.application.usecase.CreateChapterUseCaseV3;
import com.example.lms.course_authoring.application.usecase.CreateLessonUseCaseV3;
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

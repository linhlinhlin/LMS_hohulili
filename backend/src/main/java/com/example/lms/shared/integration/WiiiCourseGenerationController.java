package com.example.lms.shared.integration;

import com.example.lms.course_authoring.application.usecase.GenerateCourseFromAiUseCase;
import com.example.lms.course_authoring.application.usecase.GenerateCourseFromAiUseCase.*;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Wiii AI Course Generation endpoints.
 *
 * <p>Auth: Bearer service token via {@link WiiiServiceAuthFilter} (existing pattern).
 * <p>Design: v2.0 spec (2026-03-22), expert-reviewed (4 rounds).
 *
 * <p>Two-phase flow:
 * <ol>
 *   <li>{@code POST /generate} — create empty course shell</li>
 *   <li>{@code POST /generate/{courseId}/chapters} — push one chapter (per-chapter tx)</li>
 * </ol>
 */
@RestController
@RequestMapping("/api/v3/integration/courses")
public class WiiiCourseGenerationController {

    private static final Logger log = LoggerFactory.getLogger(WiiiCourseGenerationController.class);

    private final GenerateCourseFromAiUseCase useCase;

    public WiiiCourseGenerationController(GenerateCourseFromAiUseCase useCase) {
        this.useCase = useCase;
    }

    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<CourseShellResponse>> createCourseShell(
            @Valid @RequestBody CourseShellRequest request
    ) {
        log.info("Wiii AI: course shell request for teacher={}", request.teacherId());
        var response = useCase.createCourseShell(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Tạo khóa học thành công"));
    }

    @PostMapping("/generate/{courseId}/chapters")
    public ResponseEntity<ApiResponse<ChapterGenerationResponse>> pushChapter(
            @PathVariable UUID courseId,
            @Valid @RequestBody ChapterContentRequest request
    ) {
        log.info("Wiii AI: chapter push for course={}, chapter='{}'",
                courseId, request.title());
        try {
            var response = useCase.pushChapter(courseId, request);
            return ResponseEntity.ok(ApiResponse.success(response, "Tạo chương thành công"));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException e) {
            log.warn("Wiii AI: chapter validation failed for course={}: {}",
                    courseId, e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Dữ liệu không hợp lệ: " + e.getMessage()));
        }
    }
}

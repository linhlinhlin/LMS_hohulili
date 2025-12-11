package com.example.lms.course_management.infrastructure.web;

import com.example.lms.course_management.application.dto.AuthoringDTOs;
import com.example.lms.course_management.application.usecase.CourseAuthoringUseCase;
import com.example.lms.course_management.application.usecase.PublishCourseUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/authoring")
@RequiredArgsConstructor
public class CourseAuthoringController {

    private final PublishCourseUseCase publishCourseUseCase;
    private final CourseAuthoringUseCase courseAuthoringUseCase;

    // --- Course Operations ---

    @PostMapping("/courses/{courseId}/publish")
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR', 'ADMIN')")
    public ResponseEntity<?> publishCourse(@PathVariable UUID courseId) {
        var version = publishCourseUseCase.publish(courseId);
        return ResponseEntity.ok(version);
    }

    @GetMapping("/courses/{courseId}/draft-tree")
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR', 'ADMIN')")
    public ResponseEntity<AuthoringDTOs.CourseDraftDTO> getDraftTree(@PathVariable UUID courseId) {
        var draft = courseAuthoringUseCase.getCourseDraft(courseId);
        return ResponseEntity.ok(draft);
    }

    // --- Hierarchy Reordering ---

    @PatchMapping("/courses/{courseId}/reorder-chapters")
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR', 'ADMIN')")
    public ResponseEntity<?> reorderChapters(
            @PathVariable UUID courseId,
            @RequestBody AuthoringDTOs.ReorderRequest request) {
        courseAuthoringUseCase.reorderChapters(courseId, request.getOrderedIds());
        return ResponseEntity.ok().build();
    }
    
    // Note: API path for chapters reorder logic. 
    // Standard Rest: PATCH /chapters/{id}/reorder? 
    // But reordering is an action *on the parent* usually.
    // However, expert asked for `PATCH /authoring/chapters/{id}/reorder`.
    // This implies "Reorder lessons IN this chapter".
    @PatchMapping("/chapters/{chapterId}/reorder")
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR', 'ADMIN')")
    public ResponseEntity<?> reorderLessonsInChapter(
            @PathVariable UUID chapterId,
            @RequestBody AuthoringDTOs.ReorderRequest request) {
        courseAuthoringUseCase.reorderLessons(chapterId, request.getOrderedIds());
        return ResponseEntity.ok().build();
    }

    // --- Lesson Updates ---

    @PatchMapping("/lessons/{lessonId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR', 'ADMIN')")
    public ResponseEntity<?> updateLesson(
            @PathVariable UUID lessonId,
            @RequestBody AuthoringDTOs.UpdateLessonRequest request) {
        courseAuthoringUseCase.updateLesson(lessonId, request);
        return ResponseEntity.ok().build();
    }
}

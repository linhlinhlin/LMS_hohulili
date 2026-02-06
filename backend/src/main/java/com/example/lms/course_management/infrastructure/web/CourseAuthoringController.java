package com.example.lms.course_management.infrastructure.web;

import com.example.lms.course_management.application.usecase.PublishCourseUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Controller for course authoring operations (publish only).
 * Other authoring operations (reorder, update) are handled by CourseAuthoringControllerV3.
 */
@RestController
@RequestMapping("/api/v3/authoring")
@RequiredArgsConstructor
public class CourseAuthoringController {

    private final PublishCourseUseCase publishCourseUseCase;

    @PostMapping("/courses/{courseId}/publish")
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR', 'ADMIN')")
    public ResponseEntity<?> publishCourse(@PathVariable UUID courseId) {
        var version = publishCourseUseCase.publish(courseId);
        return ResponseEntity.ok(version);
    }
}

package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.learning_delivery.application.usecase.EnrollStudentUseCase;
import com.example.lms.learning_delivery.application.usecase.LearningUseCase;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Controller for student learning operations.
 * 
 * Uses UserJpaEntity from identity module as the authenticated principal.
 */
@RestController
@RequestMapping("/api/v3/learning")
@RequiredArgsConstructor
public class StudentLearningController {

    private final EnrollStudentUseCase enrollStudentUseCase;
    private final LearningUseCase learningUseCase;

    // Enroll in a class
    @PostMapping("/classes/{classCode}/enroll")
    public ResponseEntity<?> enroll(@PathVariable String classCode, @AuthenticationPrincipal UserJpaEntity user) {
        var enrollment = enrollStudentUseCase.enroll(user.getEmail(), classCode);
        return ResponseEntity.ok(enrollment);
    }

    // Get Learning Path (Course Content from Snapshot)
    @GetMapping("/enrollments/{enrollmentId}/path")
    public ResponseEntity<?> getLearningPath(@PathVariable UUID enrollmentId, @AuthenticationPrincipal UserJpaEntity user) {
        // Todo: Verify user owns enrollment or is admin
        var learningPath = learningUseCase.getLearningPath(enrollmentId);
        return ResponseEntity.ok(learningPath);
    }
}

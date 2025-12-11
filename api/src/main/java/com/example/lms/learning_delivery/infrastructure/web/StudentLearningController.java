package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.learning_delivery.application.usecase.EnrollStudentUseCase;
import com.example.lms.learning_delivery.application.usecase.LearningUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.example.lms.entity.User; // Legacy User
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/learning")
@RequiredArgsConstructor
public class StudentLearningController {

    private final EnrollStudentUseCase enrollStudentUseCase;
    private final LearningUseCase learningUseCase;

    // Enroll in a class
    @PostMapping("/classes/{classCode}/enroll")
    public ResponseEntity<?> enroll(@PathVariable String classCode, @AuthenticationPrincipal User user) {
        var enrollment = enrollStudentUseCase.enroll(user.getEmail(), classCode);
        return ResponseEntity.ok(enrollment);
    }

    // Get Learning Path (Course Content from Snapshot)
    @GetMapping("/enrollments/{enrollmentId}/path")
    public ResponseEntity<?> getLearningPath(@PathVariable UUID enrollmentId, @AuthenticationPrincipal User user) {
        // Todo: Verify user owns enrollment or is admin
        var learningPath = learningUseCase.getLearningPath(enrollmentId);
        return ResponseEntity.ok(learningPath);
    }
}

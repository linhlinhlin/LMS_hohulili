package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.learning_delivery.application.usecase.EnrollStudentUseCaseV3;
import com.example.lms.learning_delivery.application.usecase.CreateLearningClassUseCaseV3;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.UUID;

/**
 * V3 Controller for Learning Delivery.
 * Uses pure DDD patterns.
 */
@Tag(name = "Learning Delivery V3", description = "DDD-based learning delivery endpoints")
@RestController
@RequestMapping("/api/v3/learning")
@RequiredArgsConstructor
public class LearningDeliveryControllerV3 {

    private final EnrollStudentUseCaseV3 enrollStudentUseCase;
    private final CreateLearningClassUseCaseV3 createLearningClassUseCase;

    @Operation(summary = "Enroll a student in a class")
    @PostMapping("/classes/{classId}/enrollments")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<UUID> enrollStudent(
            @PathVariable UUID classId,
            @RequestBody EnrollRequest request
    ) {
        UUID enrollmentId = enrollStudentUseCase.enroll(request.studentId(), classId);
        return ResponseEntity.ok(enrollmentId);
    }

    @Operation(summary = "Create a new learning class")
    @PostMapping("/classes")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<UUID> createClass(@RequestBody CreateClassRequest request) {
        var command = new CreateLearningClassUseCaseV3.CreateClassCommand(
            request.courseId(),
            request.teacherId(),
            request.code(),
            request.name(),
            request.startDate(),
            request.endDate(),
            request.maxStudents()
        );
        UUID classId = createLearningClassUseCase.execute(command);
        return ResponseEntity.ok(classId);
    }

    // Request DTOs
    public record EnrollRequest(UUID studentId) {}

    public record CreateClassRequest(
        UUID courseId,
        UUID teacherId,
        String code,
        String name,
        Instant startDate,
        Instant endDate,
        Integer maxStudents
    ) {}
}

package com.example.lms.assessment.infrastructure.web;

import com.example.lms.assessment.application.dto.AssignmentDTOs.AssignmentDetail;
import com.example.lms.assessment.application.dto.CreateAssignmentCommand;
import com.example.lms.assessment.application.usecase.CreateAssignmentUseCaseV3;
import com.example.lms.assessment.application.usecase.DeleteAssignmentUseCaseV3;
import com.example.lms.assessment.application.usecase.GetAssignmentsByCourseUseCase;
import com.example.lms.assessment.application.usecase.GetTeacherAssignmentsSummaryUseCase;
import com.example.lms.assessment.application.usecase.UpdateAssignmentUseCaseV3;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentAllocationJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentAllocationStudentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentSubmissionJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaLearningClassRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v3/teacher/assignments")
@RequiredArgsConstructor
@Tag(name = "Teacher - Assignments", description = "Endpoints for teachers to manage assignments")
public class AssignmentControllerV3 {

    private final GetTeacherAssignmentsSummaryUseCase getTeacherAssignmentsSummaryUseCase;
    private final GetAssignmentsByCourseUseCase getAssignmentsByCourseUseCase;
    private final AssignmentJpaRepository assignmentRepository;
    private final com.example.lms.assessment.domain.repository.AssignmentRepository assignmentDomainRepository;
    private final AssignmentAllocationJpaRepository allocationRepository;
    private final AssignmentAllocationStudentJpaRepository allocationStudentRepository;
    private final AssignmentSubmissionJpaRepository submissionRepository;
    private final CreateAssignmentUseCaseV3 createAssignmentUseCaseV3;
    private final DeleteAssignmentUseCaseV3 deleteAssignmentUseCaseV3;
    private final UpdateAssignmentUseCaseV3 updateAssignmentUseCaseV3;
    private final JpaCourseRepository courseJpaRepository;
    private final JpaLearningClassRepository classRepository;
    private final JpaEnrollmentRepository enrollmentRepository;

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Get summary of all assignments for the current teacher")
    public ResponseEntity<ApiResponse<Object>> getTeacherAssignmentsSummary(
            @AuthenticationPrincipal UserJpaEntity user) {
        var summary = getTeacherAssignmentsSummaryUseCase.execute(user.getId());
        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @GetMapping("/courses/{courseId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Get assignments for a specific course")
    public ResponseEntity<ApiResponse<Object>> getAssignmentsByCourse(
            @PathVariable UUID courseId,
            @AuthenticationPrincipal UserJpaEntity user) {
        verifyCourseOwnership(courseId, user);
        var result = getAssignmentsByCourseUseCase.execute(courseId);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Get assignment detail by ID")
    public ResponseEntity<ApiResponse<AssignmentDetail>> getAssignmentById(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserJpaEntity user) {
        return assignmentRepository.findById(id)
                .map(assignment -> {
                    verifyAssignmentOwnership(assignment, user);
                    return ResponseEntity.ok(ApiResponse.success(toAssignmentDetail(assignment), "Assignment detail"));
                })
                .orElseThrow(() -> new EntityNotFoundException("Assignment", id));
    }

    @GetMapping("/lessons/{lessonId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Get assignment detail by lesson ID")
    public ResponseEntity<ApiResponse<AssignmentDetail>> getAssignmentByLessonId(
            @PathVariable UUID lessonId,
            @AuthenticationPrincipal UserJpaEntity user) {
        var course = courseJpaRepository.findByLessonId(lessonId)
                .orElseThrow(() -> new EntityNotFoundException("Lesson", lessonId));
        verifyCourseOwnership(course.getId(), user);

        AssignmentJpaEntity assignment = assignmentRepository.findByLessonId(lessonId).stream()
                .max(Comparator.comparing(
                        AssignmentJpaEntity::getUpdatedAt,
                        Comparator.nullsLast(Comparator.naturalOrder())
                ))
                .orElseThrow(() -> new EntityNotFoundException("Assignment for lesson", lessonId));

        verifyAssignmentOwnership(assignment, user);
        return ResponseEntity.ok(ApiResponse.success(toAssignmentDetail(assignment), "Assignment detail"));
    }

    @PostMapping("/courses/{courseId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Create new assignment")
    public ResponseEntity<ApiResponse<AssignmentDetail>> createAssignment(
            @PathVariable UUID courseId,
            @Valid @RequestBody CreateAssignmentRequest request,
            @AuthenticationPrincipal UserJpaEntity user) {
        verifyCourseOwnership(courseId, user);
        try {
            validateLessonBinding(courseId, request.lessonId());

            Instant dueDate = parseDueDate(request.dueDate());
            String distributionType = normalizeDistributionType(request.distributionType());
            validateDistributionConfiguration(courseId, distributionType, request.classId(), request.studentIds());

            UUID assignmentId = createAssignmentUseCaseV3.execute(new CreateAssignmentCommand(
                    request.lessonId(),
                    courseId,
                    request.title(),
                    request.description(),
                    request.instructions(),
                    "FILE_UPLOAD",
                    request.maxScore(),
                    dueDate,
                    true,
                    request.status(),
                    distributionType,
                    request.classId(),
                    request.studentIds()
            ));

            AssignmentJpaEntity assignment = assignmentRepository.findById(assignmentId)
                    .orElseThrow(() -> new EntityNotFoundException("Assignment", assignmentId));
            verifyAssignmentOwnership(assignment, user);

            return ResponseEntity.ok(ApiResponse.success(toAssignmentDetail(assignment), "Assignment created"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ApiResponse.error(ex.getMessage()));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Update assignment")
    public ResponseEntity<ApiResponse<AssignmentDetail>> updateAssignment(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateAssignmentRequest request,
            @AuthenticationPrincipal UserJpaEntity user) {
        AssignmentJpaEntity assignment = assignmentRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Assignment", id));
        verifyAssignmentOwnership(assignment, user);

        updateAssignmentUseCaseV3.execute(id, new UpdateAssignmentUseCaseV3.Command(
                request.title(),
                request.description(),
                request.instructions(),
                request.dueDate(),
                request.maxScore(),
                request.status()
        ));

        if (request.distributionType() != null || request.classId() != null || request.studentIds() != null) {
            String distributionType = normalizeDistributionType(
                    request.distributionType() != null
                            ? request.distributionType()
                            : inferDistributionType(request.classId(), request.studentIds())
            );
            validateDistributionConfiguration(assignment.getCourseId(), distributionType, request.classId(), request.studentIds());
            assignmentDomainRepository.allocate(
                    id,
                    distributionType,
                    request.classId(),
                    request.studentIds()
            );
        }

        AssignmentJpaEntity updated = assignmentRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Assignment", id));
        return ResponseEntity.ok(ApiResponse.success(toAssignmentDetail(updated), "Assignment updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Delete assignment")
    public ResponseEntity<ApiResponse<Void>> deleteAssignment(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserJpaEntity user) {
        AssignmentJpaEntity assignment = assignmentRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Assignment", id));
        verifyAssignmentOwnership(assignment, user);
        deleteAssignmentUseCaseV3.execute(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Assignment deleted"));
    }

    public record CreateAssignmentRequest(
            @NotBlank(message = "Title is required")
            String title,
            String description,
            String instructions,
            String dueDate,
            @Positive(message = "Max score must be positive")
            Integer maxScore,
            String status,
            String distributionType,
            UUID classId,
            List<UUID> studentIds,
            UUID lessonId
    ) {}

    public record UpdateAssignmentRequest(
            String title,
            String description,
            String instructions,
            String dueDate,
            Integer maxScore,
            String status,
            String distributionType,
            UUID classId,
            List<UUID> studentIds
    ) {}

    private AssignmentDetail toAssignmentDetail(AssignmentJpaEntity assignment) {
        var course = courseJpaRepository.findById(assignment.getCourseId()).orElse(null);
        var allocation = allocationRepository.findByAssignmentId(assignment.getId()).stream()
                .filter(candidate -> Boolean.TRUE.equals(candidate.getIsActive()))
                .max(Comparator.comparing(
                        com.example.lms.assessment.infrastructure.persistence.entity.AssignmentAllocationJpaEntity::getAllocatedAt,
                        Comparator.nullsLast(Comparator.naturalOrder())
                ))
                .orElse(null);

        String distributionType = allocation != null && allocation.getDistributionType() != null && !allocation.getDistributionType().isBlank()
                ? allocation.getDistributionType()
                : "ALL_STUDENTS";

        List<String> allocatedStudentIds = allocation != null
                ? allocationStudentRepository.findByAllocationId(allocation.getId()).stream()
                        .map(student -> student.getStudentId().toString())
                        .toList()
                : List.of();

        String classId = allocation != null && allocation.getClassId() != null ? allocation.getClassId().toString() : null;
        String className = allocation != null && allocation.getClassId() != null
                ? classRepository.findById(allocation.getClassId()).map(c -> c.getName()).orElse(null)
                : null;

        int totalStudents = switch (distributionType) {
            case "CLASS" -> allocation != null && allocation.getClassId() != null
                    ? (int) enrollmentRepository.countByClassId(allocation.getClassId())
                    : 0;
            case "SPECIFIC_STUDENTS" -> allocatedStudentIds.size();
            default -> (int) enrollmentRepository.findByLearningClass_CourseId(assignment.getCourseId()).stream()
                    .map(enrollment -> enrollment.getStudentId())
                    .distinct()
                    .count();
        };

        int submissionsCount = submissionRepository.findByAssignmentId(assignment.getId()).size();

        return AssignmentDetail.builder()
                .id(assignment.getId().toString())
                .lessonId(assignment.getLessonId() != null ? assignment.getLessonId().toString() : null)
                .title(assignment.getTitle())
                .description(assignment.getDescription())
                .instructions(assignment.getInstructions())
                .dueDate(assignment.getDueDate() != null ? assignment.getDueDate().toString() : null)
                .courseId(assignment.getCourseId().toString())
                .courseTitle(course != null ? course.getTitle() : null)
                .deliveryMode(course != null && course.getDeliveryMode() != null ? course.getDeliveryMode().name() : null)
                .status(assignment.getStatus().name())
                .submissionsCount(submissionsCount)
                .totalStudents(totalStudents)
                .classId(classId)
                .className(className)
                .distributionType(distributionType)
                .allocatedStudentIds(allocatedStudentIds)
                .createdAt(assignment.getCreatedAt() != null ? assignment.getCreatedAt().toString() : null)
                .updatedAt(assignment.getUpdatedAt() != null ? assignment.getUpdatedAt().toString() : null)
                .maxScore(assignment.getMaxScore() != null ? assignment.getMaxScore().doubleValue() : 100.0)
                .build();
    }

    private Instant parseDueDate(String dueDate) {
        if (dueDate == null || dueDate.isBlank()) {
            return null;
        }
        try {
            return Instant.parse(dueDate);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("Invalid due date format");
        }
    }

    private String inferDistributionType(UUID classId, List<UUID> studentIds) {
        if (classId != null) {
            return "CLASS";
        }
        if (studentIds != null) {
            return "SPECIFIC_STUDENTS";
        }
        return "ALL_STUDENTS";
    }

    private String normalizeDistributionType(String distributionType) {
        if (distributionType == null || distributionType.isBlank()) {
            return "ALL_STUDENTS";
        }
        return switch (distributionType.trim().toUpperCase()) {
            case "ALL_STUDENTS", "SPECIFIC_STUDENTS", "CLASS" -> distributionType.trim().toUpperCase();
            default -> throw new IllegalArgumentException("Unsupported distribution type: " + distributionType);
        };
    }

    private void validateLessonBinding(UUID courseId, UUID lessonId) {
        if (lessonId == null) {
            return;
        }

        var lessonCourse = courseJpaRepository.findByLessonId(lessonId)
                .orElseThrow(() -> new EntityNotFoundException("Lesson", lessonId));
        if (!courseId.equals(lessonCourse.getId())) {
            throw new IllegalArgumentException("Lesson does not belong to the selected course");
        }
        if (!assignmentRepository.findByLessonId(lessonId).isEmpty()) {
            throw new IllegalArgumentException("Lesson already has an assignment");
        }
    }

    private void validateDistributionConfiguration(
            UUID courseId,
            String distributionType,
            UUID classId,
            List<UUID> studentIds
    ) {
        var course = courseJpaRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Course", courseId));

        if (course.getDeliveryMode() == com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity.DeliveryMode.SELF_PACED) {
            boolean hasClassScope = classId != null || (studentIds != null && !studentIds.isEmpty());
            if (!"ALL_STUDENTS".equals(distributionType) || hasClassScope) {
                throw new IllegalArgumentException("SELF_PACED assignments only support ALL_STUDENTS distribution");
            }
            return;
        }

        switch (distributionType) {
            case "CLASS" -> {
                if (classId == null) {
                    throw new IllegalArgumentException("classId is required when distributionType is CLASS");
                }
                var learningClass = classRepository.findById(classId)
                        .orElseThrow(() -> new EntityNotFoundException("Class", classId));
                if (!courseId.equals(learningClass.getCourseId())) {
                    throw new AccessDeniedException("Class does not belong to the assignment course");
                }
            }
            case "SPECIFIC_STUDENTS" -> {
                if (studentIds == null || studentIds.isEmpty()) {
                    throw new IllegalArgumentException("studentIds are required when distributionType is SPECIFIC_STUDENTS");
                }
            }
            case "ALL_STUDENTS" -> {
                // No extra validation.
            }
            default -> throw new IllegalArgumentException("Unsupported distribution type: " + distributionType);
        }
    }

    private boolean isAdminRole(UserJpaEntity user) {
        return user.getRole() == UserJpaEntity.UserRole.ADMIN
                || user.getRole() == UserJpaEntity.UserRole.ORG_ADMIN;
    }

    private void verifyCourseOwnership(UUID courseId, UserJpaEntity user) {
        if (isAdminRole(user)) {
            return;
        }
        var course = courseJpaRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Course", courseId));
        if (course.getTeacherId() == null || !course.getTeacherId().equals(user.getId())) {
            throw new AccessDeniedException("You do not own this course");
        }
    }

    private void verifyAssignmentOwnership(AssignmentJpaEntity assignment, UserJpaEntity user) {
        if (isAdminRole(user)) {
            return;
        }
        verifyCourseOwnership(assignment.getCourseId(), user);
    }
}

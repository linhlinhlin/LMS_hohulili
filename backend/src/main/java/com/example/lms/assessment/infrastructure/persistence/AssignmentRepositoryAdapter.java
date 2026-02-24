package com.example.lms.assessment.infrastructure.persistence;

import com.example.lms.assessment.domain.model.Assignment;
import com.example.lms.assessment.domain.model.AssignmentId;
import com.example.lms.assessment.domain.repository.AssignmentRepository;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentAllocationJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentAllocationStudentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentAttachmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentRubricJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentSubmissionJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.LessonAssignmentJpaRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Repository;

import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentAllocationJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentAllocationStudentJpaEntity;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * JPA Adapter implementing AssignmentRepository domain port.
 * Bridges domain layer with JPA persistence.
 */
@Repository
@Slf4j
public class AssignmentRepositoryAdapter implements AssignmentRepository {

    private final AssignmentJpaRepository jpaRepository;
    private final AssignmentAllocationJpaRepository allocationRepository;
    private final AssignmentAllocationStudentJpaRepository allocationStudentRepository;
    private final AssignmentSubmissionJpaRepository submissionRepository;
    private final AssignmentRubricJpaRepository rubricRepository;
    private final AssignmentAttachmentJpaRepository attachmentRepository;
    private final LessonAssignmentJpaRepository lessonAssignmentRepository;

    public AssignmentRepositoryAdapter(
            AssignmentJpaRepository jpaRepository,
            AssignmentAllocationJpaRepository allocationRepository,
            AssignmentAllocationStudentJpaRepository allocationStudentRepository,
            AssignmentSubmissionJpaRepository submissionRepository,
            AssignmentRubricJpaRepository rubricRepository,
            AssignmentAttachmentJpaRepository attachmentRepository,
            LessonAssignmentJpaRepository lessonAssignmentRepository) {
        this.jpaRepository = jpaRepository;
        this.allocationRepository = allocationRepository;
        this.allocationStudentRepository = allocationStudentRepository;
        this.submissionRepository = submissionRepository;
        this.rubricRepository = rubricRepository;
        this.attachmentRepository = attachmentRepository;
        this.lessonAssignmentRepository = lessonAssignmentRepository;
    }

    @Override
    public Assignment save(Assignment assignment) {
        AssignmentJpaEntity entity = toEntity(assignment);
        AssignmentJpaEntity saved = jpaRepository.save(entity);
        return toDomain(saved);
    }

    @Override
    public Optional<Assignment> findById(AssignmentId id) {
        return jpaRepository.findById(id.value())
            .map(this::toDomain);
    }

    @Override
    public List<Assignment> findByLessonId(UUID lessonId) {
        return jpaRepository.findByLessonId(lessonId).stream()
            .map(this::toDomain)
            .collect(Collectors.toList());
    }

    @Override
    public void delete(Assignment assignment) {
        jpaRepository.deleteById(assignment.getId().value());
    }

    @Override
    public void deleteByIdWithCascade(AssignmentId id) {
        UUID assignmentId = id.value();
        log.info("Deleting assignment with cascade, ID: {}", assignmentId);

        // 1. Delete submissions
        submissionRepository.deleteByAssignmentId(assignmentId);

        // 2. Delete rubrics
        rubricRepository.deleteByAssignmentId(assignmentId);

        // 3. Delete attachments
        attachmentRepository.deleteByAssignmentId(assignmentId);

        // 4. Delete lesson assignments (links)
        lessonAssignmentRepository.deleteByAssignmentId(assignmentId);

        // 5. Delete allocations and their student mappings
        var allocations = allocationRepository.findByAssignmentId(assignmentId);
        for (var allocation : allocations) {
            allocationStudentRepository.deleteByAllocationId(allocation.getId());
        }
        allocationRepository.deleteAll(allocations);

        // 6. Finally, delete the assignment
        jpaRepository.deleteById(assignmentId);

        log.info("Successfully deleted assignment {}", assignmentId);
    }

    @Override
    public boolean existsById(AssignmentId id) {
        return jpaRepository.existsById(id.value());
    }

    @Override
    public List<Assignment> findByCourseId(UUID courseId) {
        return jpaRepository.findByCourseId(courseId).stream()
            .map(this::toDomain)
            .collect(Collectors.toList());
    }

    @Override
    public void allocate(UUID assignmentId, String distributionType, List<UUID> studentIds) {
        var allocation = AssignmentAllocationJpaEntity.builder()
            .assignmentId(assignmentId)
            .distributionType(distributionType)
            .isActive(true)
            .build();

        var savedAllocation = allocationRepository.save(allocation);

        if ("SPECIFIC_STUDENTS".equals(distributionType) && studentIds != null && !studentIds.isEmpty()) {
            studentIds.forEach(studentId -> {
                var entity = AssignmentAllocationStudentJpaEntity.builder()
                    .allocationId(savedAllocation.getId())
                    .studentId(studentId)
                    .assignedAt(Instant.now())
                    .build();
                allocationStudentRepository.save(entity);
            });
        }
    }

    @Override
    public List<Assignment> findByCourseIdIn(List<UUID> courseIds) {
        return jpaRepository.findByCourseIdIn(courseIds).stream()
            .map(this::toDomain)
            .collect(Collectors.toList());
    }

    // ============ Mapping Methods ============

    private AssignmentJpaEntity toEntity(Assignment assignment) {
        return AssignmentJpaEntity.builder()
            .id(assignment.getId().value())
            .lessonId(assignment.getLessonId())
            .courseId(assignment.getCourseId())
            .title(assignment.getTitle())
            .description(assignment.getDescription())
            .instructions(assignment.getInstructions())
            .type(mapType(assignment.getType()))
            .status(mapStatus(assignment.getStatus()))
            .maxScore(assignment.getMaxScore() != null ? java.math.BigDecimal.valueOf(assignment.getMaxScore()) : null)
            .passingScore(assignment.getPassingScore())
            .dueDate(assignment.getDueDate())
            .maxAttempts(assignment.getMaxAttempts())
            .allowLateSubmission(assignment.getAllowLateSubmission())
            .createdAt(assignment.getCreatedAt())
            .updatedAt(assignment.getUpdatedAt())
            .build();
    }

    private Assignment toDomain(AssignmentJpaEntity entity) {
        return Assignment.reconstitute(
            AssignmentId.of(entity.getId()),
            entity.getLessonId(),
            entity.getCourseId(),
            entity.getTitle(),
            entity.getDescription(),
            entity.getInstructions(),
            mapType(entity.getType()),
            mapStatus(entity.getStatus()),
            entity.getDueDate(),
            entity.getMaxScore() != null ? entity.getMaxScore().intValue() : null,
            entity.getPassingScore(),
            entity.getMaxAttempts(),
            entity.getAllowLateSubmission(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    private AssignmentJpaEntity.AssignmentType mapType(Assignment.AssignmentType type) {
        if (type == null) return AssignmentJpaEntity.AssignmentType.FILE_UPLOAD;
        return switch (type) {
            case ESSAY -> AssignmentJpaEntity.AssignmentType.ESSAY;
            case FILE_UPLOAD -> AssignmentJpaEntity.AssignmentType.FILE_UPLOAD;
            case PROJECT -> AssignmentJpaEntity.AssignmentType.PROJECT;
            case PRESENTATION -> AssignmentJpaEntity.AssignmentType.PRESENTATION;
            case TEXT -> AssignmentJpaEntity.AssignmentType.TEXT;
            case QUIZ -> AssignmentJpaEntity.AssignmentType.QUIZ;
        };
    }

    private Assignment.AssignmentType mapType(AssignmentJpaEntity.AssignmentType type) {
        if (type == null) return Assignment.AssignmentType.ESSAY;
        return switch (type) {
            case ESSAY -> Assignment.AssignmentType.ESSAY;
            case FILE_UPLOAD -> Assignment.AssignmentType.FILE_UPLOAD;
            case PROJECT -> Assignment.AssignmentType.PROJECT;
            case PRESENTATION -> Assignment.AssignmentType.PRESENTATION;
            case TEXT -> Assignment.AssignmentType.TEXT;
            case QUIZ -> Assignment.AssignmentType.QUIZ;
        };
    }

    private AssignmentJpaEntity.AssignmentStatus mapStatus(Assignment.AssignmentStatus status) {
        if (status == null) return AssignmentJpaEntity.AssignmentStatus.DRAFT;
        return switch (status) {
            case DRAFT -> AssignmentJpaEntity.AssignmentStatus.DRAFT;
            case PUBLISHED -> AssignmentJpaEntity.AssignmentStatus.PUBLISHED;
            case CLOSED -> AssignmentJpaEntity.AssignmentStatus.CLOSED;
            case ARCHIVED -> AssignmentJpaEntity.AssignmentStatus.ARCHIVED;
        };
    }

    private Assignment.AssignmentStatus mapStatus(AssignmentJpaEntity.AssignmentStatus status) {
        if (status == null) return Assignment.AssignmentStatus.DRAFT;
        return switch (status) {
            case DRAFT -> Assignment.AssignmentStatus.DRAFT;
            case PUBLISHED -> Assignment.AssignmentStatus.PUBLISHED;
            case CLOSED -> Assignment.AssignmentStatus.CLOSED;
            case ARCHIVED -> Assignment.AssignmentStatus.ARCHIVED;
        };
    }
}

package com.example.lms.assessment.infrastructure.persistence;

import com.example.lms.assessment.domain.model.Assignment;
import com.example.lms.assessment.domain.model.AssignmentId;
import com.example.lms.assessment.domain.repository.AssignmentRepository;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * JPA Adapter implementing AssignmentRepository domain port.
 * Bridges domain layer with JPA persistence.
 */
@Repository
public class AssignmentRepositoryAdapter implements AssignmentRepository {

    public AssignmentRepositoryAdapter(AssignmentJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    private final AssignmentJpaRepository jpaRepository;

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
    public boolean existsById(AssignmentId id) {
        return jpaRepository.existsById(id.value());
    }

    // ============ Mapping Methods ============

    private AssignmentJpaEntity toEntity(Assignment assignment) {
        return AssignmentJpaEntity.builder()
            .id(assignment.getId().value())
            .lessonId(assignment.getLessonId())
            .title(assignment.getTitle())
            .description(assignment.getDescription())
            .instructions(assignment.getInstructions())
            .type(mapType(assignment.getType()))
            .status(mapStatus(assignment.getStatus()))
            .maxScore(assignment.getMaxScore())
            .dueDate(assignment.getDueDate())
            .createdAt(assignment.getCreatedAt())
            .updatedAt(assignment.getUpdatedAt())
            .build();
    }

    private Assignment toDomain(AssignmentJpaEntity entity) {
        return Assignment.reconstitute(
            AssignmentId.of(entity.getId()),
            entity.getLessonId(),
            entity.getTitle(),
            entity.getDescription(),
            entity.getInstructions(),
            mapType(entity.getType()),
            mapStatus(entity.getStatus()),
            entity.getDueDate(),
            entity.getMaxScore(),
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
            case PRESENTATION -> AssignmentJpaEntity.AssignmentType.FILE_UPLOAD; // Map to closest
        };
    }

    private Assignment.AssignmentType mapType(AssignmentJpaEntity.AssignmentType type) {
        if (type == null) return Assignment.AssignmentType.ESSAY;
        return switch (type) {
            case ESSAY -> Assignment.AssignmentType.ESSAY;
            case FILE_UPLOAD -> Assignment.AssignmentType.FILE_UPLOAD;
            case PROJECT -> Assignment.AssignmentType.PROJECT;
            case TEXT, QUIZ -> Assignment.AssignmentType.ESSAY; // Map to closest
        };
    }

    private AssignmentJpaEntity.AssignmentStatus mapStatus(Assignment.AssignmentStatus status) {
        if (status == null) return AssignmentJpaEntity.AssignmentStatus.DRAFT;
        return switch (status) {
            case DRAFT -> AssignmentJpaEntity.AssignmentStatus.DRAFT;
            case PUBLISHED -> AssignmentJpaEntity.AssignmentStatus.PUBLISHED;
            case CLOSED -> AssignmentJpaEntity.AssignmentStatus.CLOSED;
        };
    }

    private Assignment.AssignmentStatus mapStatus(AssignmentJpaEntity.AssignmentStatus status) {
        if (status == null) return Assignment.AssignmentStatus.DRAFT;
        return switch (status) {
            case DRAFT -> Assignment.AssignmentStatus.DRAFT;
            case PUBLISHED -> Assignment.AssignmentStatus.PUBLISHED;
            case CLOSED, ARCHIVED -> Assignment.AssignmentStatus.CLOSED;
        };
    }
}

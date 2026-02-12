package com.example.lms.assessment.infrastructure.persistence;

import com.example.lms.assessment.domain.model.Rubric;
import com.example.lms.assessment.domain.repository.RubricRepository;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentRubricJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentRubricJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class RubricRepositoryAdapter implements RubricRepository {

    private final AssignmentRubricJpaRepository jpaRepository;

    @Override
    public Rubric save(Rubric rubric) {
        AssignmentRubricJpaEntity entity = toEntity(rubric);
        AssignmentRubricJpaEntity saved = jpaRepository.save(entity);
        return toDomain(saved);
    }

    @Override
    public Optional<Rubric> findById(UUID id) {
        return jpaRepository.findById(id).map(this::toDomain);
    }

    @Override
    public List<Rubric> findByTeacherId(UUID teacherId) {
        return jpaRepository.findByTeacherIdOrderByCreatedAtDesc(teacherId).stream()
                .map(this::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public Optional<Rubric> findByAssignmentId(UUID assignmentId) {
        return jpaRepository.findByAssignmentId(assignmentId).map(this::toDomain);
    }

    @Override
    public void deleteById(UUID id) {
        jpaRepository.deleteById(id);
    }

    // ============================================================
    // Mapping: Domain <-> JPA Entity
    // ============================================================

    private AssignmentRubricJpaEntity toEntity(Rubric rubric) {
        List<AssignmentRubricJpaEntity.RubricCriterion> criteriaEntities = rubric.getCriteria().stream()
                .map(c -> AssignmentRubricJpaEntity.RubricCriterion.builder()
                        .name(c.name())
                        .description(c.description())
                        .maxPoints(c.maxPoints())
                        .levels(c.levels() != null ? c.levels().stream()
                                .map(l -> AssignmentRubricJpaEntity.RubricLevel.builder()
                                        .label(l.label())
                                        .description(l.description())
                                        .points(l.points())
                                        .build())
                                .collect(Collectors.toList()) : List.of())
                        .build())
                .collect(Collectors.toList());

        return AssignmentRubricJpaEntity.builder()
                .id(rubric.getId())
                .teacherId(rubric.getTeacherId())
                .assignmentId(rubric.getAssignmentId())
                .title(rubric.getTitle())
                .description(rubric.getDescription())
                .maxPoints(rubric.getMaxPoints())
                .criteria(criteriaEntities)
                .createdAt(rubric.getCreatedAt())
                .updatedAt(rubric.getUpdatedAt())
                .build();
    }

    private Rubric toDomain(AssignmentRubricJpaEntity entity) {
        List<Rubric.Criterion> criteria = entity.getCriteria() != null
                ? entity.getCriteria().stream()
                    .map(c -> new Rubric.Criterion(
                            c.getName(),
                            c.getDescription(),
                            c.getMaxPoints(),
                            c.getLevels() != null ? c.getLevels().stream()
                                    .map(l -> new Rubric.Level(l.getLabel(), l.getDescription(), l.getPoints()))
                                    .collect(Collectors.toList()) : List.of()))
                    .collect(Collectors.toList())
                : List.of();

        return Rubric.reconstitute(
                entity.getId(),
                entity.getTeacherId(),
                entity.getAssignmentId(),
                entity.getTitle(),
                entity.getDescription(),
                entity.getMaxPoints(),
                criteria,
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}

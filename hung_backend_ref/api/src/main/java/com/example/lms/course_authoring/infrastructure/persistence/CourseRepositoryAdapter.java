package com.example.lms.course_authoring.infrastructure.persistence;

import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepositoryPort;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.mapper.CourseEntityMapper;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CourseJpaRepositoryV2;
import com.example.lms.shared.domain.valueobject.CourseCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Repository adapter for Course aggregate.
 * 
 * This is an ADAPTER in Hexagonal Architecture - implements the
 * domain port using infrastructure components.
 */
@Repository("courseRepositoryAdapter")
public class CourseRepositoryAdapter implements CourseRepositoryPort {

    public CourseRepositoryAdapter(CourseJpaRepositoryV2 jpaRepository, CourseEntityMapper mapper) {
        this.jpaRepository = jpaRepository;
        this.mapper = mapper;
    }

    private final CourseJpaRepositoryV2 jpaRepository;
    private final CourseEntityMapper mapper;

    @Override
    public Course save(Course course) {
        CourseJpaEntity entity = mapper.toEntity(course);
        CourseJpaEntity saved = jpaRepository.save(entity);
        // Note: Currently returns the same course as domain model
        // Full implementation would need toDomain() mapper
        return course;
    }

    @Override
    public Optional<Course> findById(UUID id) {
        // Note: This requires CourseJpaEntity -> Course mapping
        // For now, return empty - full implementation needs toDomain mapper
        return Optional.empty();
    }

    @Override
    public Optional<Course> findByCode(CourseCode code) {
        return Optional.empty();
    }

    @Override
    public List<Course> findByTeacherId(UUID teacherId) {
        return List.of();
    }

    @Override
    public List<Course> findByStatus(Course.CourseStatus status) {
        return List.of();
    }

    @Override
    public boolean existsByCode(String code) {
        return jpaRepository.existsByCode(code);
    }

    @Override
    public long countByTeacherId(UUID teacherId) {
        return jpaRepository.countByTeacherId(teacherId);
    }

    @Override
    public void deleteById(UUID id) {
        jpaRepository.deleteById(id);
    }
}

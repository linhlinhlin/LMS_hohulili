package com.example.lms.course_authoring.infrastructure.persistence;

import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.mapper.CourseEntityMapper;
import com.example.lms.shared.domain.valueobject.CourseCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

/**
 * Implementation of CourseRepository using Spring Data JPA.
 * Clean Architecture: Converts between domain models and JPA entities.
 */
@Component
@RequiredArgsConstructor
public class CourseRepositoryImpl implements CourseRepository {

    private final JpaCourseRepository jpaRepository;
    private final CourseEntityMapper mapper;

    @Override
    public Course save(Course course) {
        CourseJpaEntity entity = mapper.toEntity(course);
        CourseJpaEntity saved = jpaRepository.save(entity);
        return mapper.toDomain(saved);
    }

    @Override
    public Optional<Course> findById(UUID id) {
        return jpaRepository.findById(id).map(mapper::toDomain);
    }

    @Override
    public Optional<Course> findByIdWithContent(UUID id) {
        return jpaRepository.findByIdWithContent(id).map(mapper::toDomain);
    }

    @Override
    public Optional<Course> findByCode(CourseCode code) {
        return jpaRepository.findByCodeValue(code.getValue()).map(mapper::toDomain);
    }

    @Override
    public boolean existsByCode(CourseCode code) {
        return jpaRepository.existsByCodeValue(code.getValue());
    }

    @Override
    public void delete(Course course) {
        if (course != null && course.getId() != null) {
            jpaRepository.deleteById(course.getId());
        }
    }

    @Override
    public void deleteById(UUID id) {
        jpaRepository.deleteById(id);
    }

    @Override
    public Page<Course> findByTeacherId(UUID teacherId, Pageable pageable) {
        return jpaRepository.findByTeacherId(teacherId, pageable)
                .map(mapper::toDomain);
    }

    @Override
    public Page<Course> findApproved(Pageable pageable) {
        return jpaRepository.findByStatus(CourseJpaEntity.CourseStatus.APPROVED, pageable)
                .map(mapper::toDomain);
    }

    @Override
    public Page<Course> findApprovedByTitleContaining(String search, Pageable pageable) {
        return jpaRepository.findByStatusAndTitleContaining(
                CourseJpaEntity.CourseStatus.APPROVED, search, pageable)
                .map(mapper::toDomain);
    }

    @Override
    public Page<Course> findPending(Pageable pageable) {
        return jpaRepository.findByStatus(CourseJpaEntity.CourseStatus.PENDING, pageable)
                .map(mapper::toDomain);
    }

    @Override
    public long countByTeacherId(UUID teacherId) {
        return jpaRepository.countByTeacherId(teacherId);
    }

    @Override
    public long countByStatus(Course.CourseStatus status) {
        CourseJpaEntity.CourseStatus entityStatus = mapStatusToEntity(status);
        return jpaRepository.countByStatus(entityStatus);
    }

    @Override
    public Page<Course> findAll(Pageable pageable) {
        return jpaRepository.findAll(pageable).map(mapper::toDomain);
    }

    @Override
    public Page<Course> findByStatus(Course.CourseStatus status, Pageable pageable) {
        CourseJpaEntity.CourseStatus entityStatus = mapStatusToEntity(status);
        return jpaRepository.findByStatus(entityStatus, pageable).map(mapper::toDomain);
    }

    @Override
    public long count() {
        return jpaRepository.count();
    }

    @Override
    public boolean existsById(UUID id) {
        return jpaRepository.existsById(id);
    }

    @Override
    public boolean existsByCodeValue(String code) {
        return jpaRepository.existsByCodeValue(code);
    }

    @Override
    public Optional<Course> findByChapterId(UUID chapterId) {
        return jpaRepository.findByChapterId(chapterId).map(mapper::toDomain);
    }

    @Override
    public Optional<Course> findByLessonId(UUID lessonId) {
        return jpaRepository.findByLessonId(lessonId).map(mapper::toDomain);
    }

    @Override
    public Page<Course> findByStatusAndTitleContaining(Course.CourseStatus status, String search, Pageable pageable) {
        CourseJpaEntity.CourseStatus entityStatus = mapStatusToEntity(status);
        return jpaRepository.findByStatusAndTitleContaining(entityStatus, search, pageable)
                .map(mapper::toDomain);
    }

    /**
     * Helper to map domain status to entity status for queries.
     */
    private CourseJpaEntity.CourseStatus mapStatusToEntity(Course.CourseStatus domainStatus) {
        if (domainStatus == null) return CourseJpaEntity.CourseStatus.DRAFT;
        return switch (domainStatus) {
            case DRAFT -> CourseJpaEntity.CourseStatus.DRAFT;
            case PENDING -> CourseJpaEntity.CourseStatus.PENDING;
            case APPROVED -> CourseJpaEntity.CourseStatus.APPROVED;
            case REJECTED -> CourseJpaEntity.CourseStatus.REJECTED;
            case PUBLISHED -> CourseJpaEntity.CourseStatus.PUBLISHED;
            case ARCHIVED -> CourseJpaEntity.CourseStatus.ARCHIVED;
        };
    }
}

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
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Implementation of CourseRepository using Spring Data JPA.
 * Clean Architecture: Converts between domain models and JPA entities.
 */
@Component
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CourseRepositoryImpl implements CourseRepository {

    private final JpaCourseRepository jpaRepository;
    private final CourseEntityMapper mapper;

    @Override
    @Transactional
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
    @Transactional
    public void delete(Course course) {
        if (course != null && course.getId() != null) {
            jpaRepository.deleteById(course.getId());
        }
    }

    @Override
    @Transactional
    public void deleteById(UUID id) {
        jpaRepository.deleteById(id);
    }

    @Override
    public Page<Course> findByTeacherId(UUID teacherId, Pageable pageable) {
        return jpaRepository.findByTeacherId(teacherId, pageable)
                .map(mapper::toDomain);
    }

    @Override
    public Page<Course> findByTeacherIds(Set<UUID> teacherIds, Pageable pageable) {
        if (teacherIds == null || teacherIds.isEmpty()) {
            return Page.empty(pageable);
        }
        return jpaRepository.findByTeacherIdIn(teacherIds, pageable)
                .map(mapper::toDomain);
    }

    @Override
    public Page<Course> findByTeacherIdsAndStatus(Set<UUID> teacherIds, Course.CourseStatus status, Pageable pageable) {
        if (teacherIds == null || teacherIds.isEmpty()) {
            return Page.empty(pageable);
        }
        CourseJpaEntity.CourseStatus entityStatus = mapStatusToEntity(status);
        return jpaRepository.findByTeacherIdInAndStatus(teacherIds, entityStatus, pageable)
                .map(mapper::toDomain);
    }

    @Override
    public Page<Course> findByTeacherIdsAndTitleContaining(Set<UUID> teacherIds, String search, Pageable pageable) {
        if (teacherIds == null || teacherIds.isEmpty()) {
            return Page.empty(pageable);
        }
        return jpaRepository.findByTeacherIdInAndTitleContaining(teacherIds, search, pageable)
                .map(mapper::toDomain);
    }

    @Override
    public Page<Course> findByTeacherIdsAndStatusAndTitleContaining(Set<UUID> teacherIds, Course.CourseStatus status, String search, Pageable pageable) {
        if (teacherIds == null || teacherIds.isEmpty()) {
            return Page.empty(pageable);
        }
        CourseJpaEntity.CourseStatus entityStatus = mapStatusToEntity(status);
        return jpaRepository.findByTeacherIdInAndStatusAndTitleContaining(teacherIds, entityStatus, search, pageable)
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
                CourseJpaEntity.CourseStatus.APPROVED.name(), search, pageable)
                .map(mapper::toDomain);
    }

    @Override
    public Page<Course> findPending(Pageable pageable) {
        return jpaRepository.findByStatus(CourseJpaEntity.CourseStatus.PENDING, pageable)
                .map(mapper::toDomain);
    }

    @Override
    public Page<Course> findReviewQueue(Pageable pageable) {
        return jpaRepository.findReviewQueue(pageable).map(mapper::toDomain);
    }

    @Override
    public Page<Course> findReviewQueueByTeacherIds(Set<UUID> teacherIds, Pageable pageable) {
        if (teacherIds == null || teacherIds.isEmpty()) {
            return Page.empty(pageable);
        }
        return jpaRepository.findReviewQueueByTeacherIdIn(teacherIds, pageable)
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
    public long countReviewQueue() {
        return jpaRepository.countReviewQueue();
    }

    @Override
    public long countReviewQueueByTeacherIds(Set<UUID> teacherIds) {
        if (teacherIds == null || teacherIds.isEmpty()) return 0;
        return jpaRepository.countReviewQueueByTeacherIdIn(teacherIds);
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
    public Page<Course> findByStatusAndFilters(
            Course.CourseStatus status,
            Set<UUID> categoryIds,
            Course.DeliveryMode deliveryMode,
            String search,
            Pageable pageable
) {
        String entityStatus = mapStatusToEntity(status).name();
        String entityDeliveryMode = deliveryMode != null ? deliveryMode.name() : null;
        boolean categoryFilter = categoryIds != null && !categoryIds.isEmpty();
        List<UUID> effectiveCategoryIds = categoryFilter ? List.copyOf(categoryIds) : List.of(new UUID(0L, 0L));
        String normalizedSearch = search != null && !search.isBlank() ? search.trim() : null;
        return jpaRepository.findByStatusAndFilters(
                        entityStatus,
                        effectiveCategoryIds,
                        categoryFilter,
                        entityDeliveryMode,
                        normalizedSearch,
                        pageable)
                .map(mapper::toDomain);
    }

    @Override
    public Page<Course> findByStatusAndFiltersOrderByPopularity(
            Course.CourseStatus status,
            Set<UUID> categoryIds,
            Course.DeliveryMode deliveryMode,
            String search,
            Pageable pageable
) {
        String entityStatus = mapStatusToEntity(status).name();
        String entityDeliveryMode = deliveryMode != null ? deliveryMode.name() : null;
        boolean categoryFilter = categoryIds != null && !categoryIds.isEmpty();
        List<UUID> effectiveCategoryIds = categoryFilter ? List.copyOf(categoryIds) : List.of(new UUID(0L, 0L));
        String normalizedSearch = search != null && !search.isBlank() ? search.trim() : null;
        return jpaRepository.findByStatusAndFiltersOrderByPopularity(
                        entityStatus,
                        effectiveCategoryIds,
                        categoryFilter,
                        entityDeliveryMode,
                        normalizedSearch,
                        pageable)
                .map(mapper::toDomain);
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
        String entityStatus = mapStatusToEntity(status).name();
        return jpaRepository.findByStatusAndTitleContaining(entityStatus, search, pageable)
                .map(mapper::toDomain);
    }

    @Override
    public Page<Course> findByTitleContaining(String search, Pageable pageable) {
        return jpaRepository.findByTitleContaining(search, pageable)
                .map(mapper::toDomain);
    }

    @Override
    public Page<Course> findByStatusAndCategoryId(Course.CourseStatus status, UUID categoryId, Pageable pageable) {
        CourseJpaEntity.CourseStatus entityStatus = mapStatusToEntity(status);
        return jpaRepository.findByStatusAndCategoryId(entityStatus, categoryId, pageable).map(mapper::toDomain);
    }

    @Override
    public Page<Course> findByStatusAndCategoryIdAndTitleContaining(Course.CourseStatus status, UUID categoryId, String search, Pageable pageable) {
        String entityStatus = mapStatusToEntity(status).name();
        return jpaRepository.findByStatusAndCategoryIdAndTitleContaining(entityStatus, categoryId, search, pageable)
                .map(mapper::toDomain);
    }

    @Override
    public int findMaxSequenceNumberByPrefix(String prefix) {
        Integer max = jpaRepository.findMaxSequenceNumberByPrefix(prefix);
        return max != null ? max : 0;
    }

    @Override
    public long countByTeacherIdIn(Set<UUID> teacherIds) {
        if (teacherIds == null || teacherIds.isEmpty()) return 0;
        return jpaRepository.countByTeacherIdIn(teacherIds);
    }

    @Override
    public long countByStatusAndTeacherIdIn(Course.CourseStatus status, Set<UUID> teacherIds) {
        if (teacherIds == null || teacherIds.isEmpty()) return 0;
        CourseJpaEntity.CourseStatus entityStatus = mapStatusToEntity(status);
        return jpaRepository.countByStatusAndTeacherIdIn(entityStatus, teacherIds);
    }

    @Override
    public List<UUID> findCourseIdsByTeacherIdIn(Set<UUID> teacherIds) {
        if (teacherIds == null || teacherIds.isEmpty()) return List.of();
        return jpaRepository.findCourseIdsByTeacherIdIn(teacherIds);
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
        };
    }
}

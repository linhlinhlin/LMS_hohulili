package com.example.lms.course_authoring.domain.repository;

import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.shared.domain.valueobject.CourseCode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Repository interface for Course aggregate.
 * This is a domain port - implementation is in infrastructure layer.
 */
public interface CourseRepository {

    /**
     * Save a course (create or update).
     */
    Course save(Course course);

    /**
     * Find course by ID.
     */
    Optional<Course> findById(UUID id);

    /**
     * Find course by ID with chapters and lessons eagerly loaded.
     */
    Optional<Course> findByIdWithContent(UUID id);

    /**
     * Find course by code.
     */
    Optional<Course> findByCode(CourseCode code);

    /**
     * Check if a course code already exists.
     */
    boolean existsByCode(CourseCode code);

    /**
     * Delete a course.
     */
    void delete(Course course);

    /**
     * Delete a course by ID.
     */
    void deleteById(UUID id);

    /**
     * Find all courses by teacher ID.
     */
    Page<Course> findByTeacherId(UUID teacherId, Pageable pageable);

    /**
     * Find courses owned by any teacher in the provided organization-scoped set.
     */
    Page<Course> findByTeacherIds(Set<UUID> teacherIds, Pageable pageable);

    /**
     * Find org-scoped courses by raw course status.
     */
    Page<Course> findByTeacherIdsAndStatus(Set<UUID> teacherIds, Course.CourseStatus status, Pageable pageable);

    /**
     * Find org-scoped courses by title search.
     */
    Page<Course> findByTeacherIdsAndTitleContaining(Set<UUID> teacherIds, String search, Pageable pageable);

    /**
     * Find org-scoped courses by status and title search.
     */
    Page<Course> findByTeacherIdsAndStatusAndTitleContaining(Set<UUID> teacherIds, Course.CourseStatus status, String search, Pageable pageable);

    /**
     * Find courses owned by an organization.
     */
    Page<Course> findByOrganizationId(UUID organizationId, Pageable pageable);

    /**
     * Find organization-owned courses by raw course status.
     */
    Page<Course> findByOrganizationIdAndStatus(UUID organizationId, Course.CourseStatus status, Pageable pageable);

    /**
     * Find organization-owned courses by title search.
     */
    Page<Course> findByOrganizationIdAndTitleContaining(UUID organizationId, String search, Pageable pageable);

    /**
     * Find organization-owned courses by status and title search.
     */
    Page<Course> findByOrganizationIdAndStatusAndTitleContaining(UUID organizationId, Course.CourseStatus status, String search, Pageable pageable);

    /**
     * Find all approved courses.
     */
    Page<Course> findApproved(Pageable pageable);

    /**
     * Find approved courses with search.
     */
    Page<Course> findApprovedByTitleContaining(String search, Pageable pageable);

    /**
     * Find all pending courses (for admin review).
     */
    Page<Course> findPending(Pageable pageable);

    /**
     * Find the full review queue: initial submissions plus pending draft changes on approved courses.
     */
    Page<Course> findReviewQueue(Pageable pageable);

    /**
     * Find the review queue scoped to teachers within an organization.
     */
    Page<Course> findReviewQueueByTeacherIds(Set<UUID> teacherIds, Pageable pageable);

    /**
     * Find the review queue scoped to direct organization ownership.
     */
    Page<Course> findReviewQueueByOrganizationId(UUID organizationId, Pageable pageable);

    /**
     * Count courses by teacher ID.
     */
    long countByTeacherId(UUID teacherId);

    /**
     * Count courses by status.
     */
    long countByStatus(Course.CourseStatus status);

    /**
     * Count the review queue across the whole system.
     */
    long countReviewQueue();

    /**
     * Count the review queue for an organization's teachers.
     */
    long countReviewQueueByTeacherIds(Set<UUID> teacherIds);

    /**
     * Count courses owned by an organization.
     */
    long countByOrganizationId(UUID organizationId);

    /**
     * Count organization-owned courses by status.
     */
    long countByStatusAndOrganizationId(Course.CourseStatus status, UUID organizationId);

    /**
     * Count the review queue scoped to direct organization ownership.
     */
    long countReviewQueueByOrganizationId(UUID organizationId);

    /**
     * Find all courses with pagination.
     */
    Page<Course> findAll(Pageable pageable);

    /**
     * Find courses by status with pagination.
     */
    Page<Course> findByStatus(Course.CourseStatus status, Pageable pageable);

    /**
     * Count all courses.
     */
    long count();

    /**
     * Check if course exists by ID.
     */
    boolean existsById(UUID id);

    /**
     * Check if course with given code exists.
     */
    boolean existsByCodeValue(String code);

    /**
     * Find course containing a specific chapter.
     */
    Optional<Course> findByChapterId(UUID chapterId);

    /**
     * Find course containing a specific lesson.
     */
    Optional<Course> findByLessonId(UUID lessonId);

    /**
     * Find courses by status and title containing search text.
     */
    Page<Course> findByStatusAndTitleContaining(Course.CourseStatus status, String search, Pageable pageable);

    /**
     * Find courses by status and optional category, delivery mode, and search filters.
     */
    Page<Course> findByStatusAndFilters(
            Course.CourseStatus status,
            Set<UUID> categoryIds,
            Course.DeliveryMode deliveryMode,
            String search,
            Pageable pageable);

    Page<Course> findByStatusAndCategoryId(Course.CourseStatus status, UUID categoryId, Pageable pageable);

    Page<Course> findByStatusAndCategoryIdAndTitleContaining(Course.CourseStatus status, UUID categoryId, String search, Pageable pageable);

    /**
     * Find all courses by title containing search text (any status).
     */
    Page<Course> findByTitleContaining(String search, Pageable pageable);

    /**
     * Find the maximum sequence number for auto-generated course codes with the given prefix.
     * Only matches codes in the format PREFIX-NNN (e.g., NAV-001).
     */
    int findMaxSequenceNumberByPrefix(String prefix);

    /**
     * Count courses whose teacher is in the given set of teacher IDs.
     * Used for org-scoped analytics.
     */
    long countByTeacherIdIn(Set<UUID> teacherIds);

    /**
     * Count courses by status whose teacher is in the given set of teacher IDs.
     * Used for org-scoped analytics.
     */
    long countByStatusAndTeacherIdIn(Course.CourseStatus status, Set<UUID> teacherIds);

    /**
     * Find course IDs whose teacher is in the given set of teacher IDs.
     * Returns only IDs (not full domain objects) for efficient batch queries.
     * Used for org-scoped enrollment and revenue analytics.
     */
    List<UUID> findCourseIdsByTeacherIdIn(Set<UUID> teacherIds);

    /**
     * Find course IDs owned by an organization.
     */
    List<UUID> findCourseIdsByOrganizationId(UUID organizationId);
}

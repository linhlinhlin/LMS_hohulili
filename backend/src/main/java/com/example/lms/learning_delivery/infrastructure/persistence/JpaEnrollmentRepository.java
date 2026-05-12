package com.example.lms.learning_delivery.infrastructure.persistence;

import com.example.lms.learning_delivery.infrastructure.persistence.entity.EnrollmentJpaEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for Enrollment entity.
 * Uses JPA Entity (infrastructure layer), NOT domain model.
 */
@Repository
public interface JpaEnrollmentRepository extends JpaRepository<EnrollmentJpaEntity, UUID> {

    @Query("SELECT e FROM EnrollmentJpaEntity e WHERE e.studentId = :studentId AND e.learningClass.id = :classId")
    Optional<EnrollmentJpaEntity> findByStudentIdAndLearningClassId(
            @Param("studentId") UUID studentId,
            @Param("classId") UUID classId
    );

    // Alias for controllers expecting classId naming
    @Query("SELECT e FROM EnrollmentJpaEntity e WHERE e.studentId = :studentId AND e.learningClass.id = :classId")
    Optional<EnrollmentJpaEntity> findByStudentIdAndClassId(
            @Param("studentId") UUID studentId,
            @Param("classId") UUID classId
    );

    @Query("SELECT COUNT(e) > 0 FROM EnrollmentJpaEntity e WHERE e.studentId = :studentId AND e.learningClass.id = :classId")
    boolean existsByStudentIdAndLearningClassId(
            @Param("studentId") UUID studentId,
            @Param("classId") UUID classId
    );

    // Alias for controllers expecting classId naming
    @Query("SELECT COUNT(e) > 0 FROM EnrollmentJpaEntity e WHERE e.studentId = :studentId AND e.learningClass.id = :classId")
    boolean existsByStudentIdAndClassId(
            @Param("studentId") UUID studentId,
            @Param("classId") UUID classId
    );

    @Query("SELECT e FROM EnrollmentJpaEntity e JOIN FETCH e.learningClass WHERE e.studentId = :studentId")
    List<EnrollmentJpaEntity> findByStudentId(@Param("studentId") UUID studentId);

    @Query("SELECT e FROM EnrollmentJpaEntity e JOIN FETCH e.learningClass WHERE e.studentId = :studentId AND e.status = 'ACTIVE'")
    List<EnrollmentJpaEntity> findActiveByStudentId(@Param("studentId") UUID studentId);

    @Query("SELECT e FROM EnrollmentJpaEntity e WHERE e.learningClass.id = :classId")
    Page<EnrollmentJpaEntity> findByClassId(@Param("classId") UUID classId, Pageable pageable);

    @Query("SELECT e FROM EnrollmentJpaEntity e WHERE e.learningClass.id = :classId")
    List<EnrollmentJpaEntity> findAllByClassId(@Param("classId") UUID classId);

    @Query("SELECT COUNT(e) FROM EnrollmentJpaEntity e WHERE e.learningClass.id = :classId")
    long countByClassId(@Param("classId") UUID classId);

    @Query("SELECT COUNT(e) FROM EnrollmentJpaEntity e WHERE e.learningClass.id = :classId AND e.status = 'ACTIVE'")
    long countActiveByClassId(@Param("classId") UUID classId);

    /**
     * Check if any enrollment exists for a course (across all classes).
     * Used to lock delivery mode changes after first enrollment (Open edX immutable pattern).
     */
    @Query("SELECT COUNT(e) > 0 FROM EnrollmentJpaEntity e JOIN e.learningClass lc WHERE lc.courseId = :courseId")
    boolean existsByCourseId(@Param("courseId") UUID courseId);

    /**
     * SOTA: Single-query enrollment fetch with JOIN FETCH (Dec 2025)
     * Replaces 2 sequential queries with 1 query.
     * Pattern from Google/YouTube: Eliminate N+1 by eager loading related data.
     */
    @Query("""
        SELECT e FROM EnrollmentJpaEntity e
        JOIN FETCH e.learningClass lc
        WHERE e.studentId = :studentId
        AND e.status = 'ACTIVE'
    """)
    List<EnrollmentJpaEntity> findActiveWithClass(@Param("studentId") UUID studentId);

    /**
     * Fetch ACTIVE + COMPLETED enrollments for student dashboard/my-courses.
     * SOTA (Canvas/Coursera): Students see both in-progress and completed courses.
     * Sorted by lastAccessedAt DESC so "Gần đây nhất" (Most Recent) works correctly.
     */
    @Query("""
        SELECT e FROM EnrollmentJpaEntity e
        LEFT JOIN FETCH e.learningClass lc
        WHERE e.studentId = :studentId
        AND e.status IN ('ACTIVE', 'COMPLETED')
        ORDER BY e.lastAccessedAt DESC NULLS LAST
    """)
    List<EnrollmentJpaEntity> findActiveAndCompletedWithClass(@Param("studentId") UUID studentId);

    @Query("""
        SELECT e FROM EnrollmentJpaEntity e
        LEFT JOIN FETCH e.learningClass lc
        WHERE e.studentId = :studentId
    """)
    List<EnrollmentJpaEntity> findByStudentIdWithClass(@Param("studentId") UUID studentId);

    // Find all enrollments for a course (via learning classes)
    @Query("SELECT e FROM EnrollmentJpaEntity e JOIN FETCH e.learningClass lc WHERE lc.courseId = :courseId")
    List<EnrollmentJpaEntity> findByLearningClass_CourseId(@Param("courseId") UUID courseId);

    // Batch: find all enrollments for multiple courses (1 query instead of N)
    @Query("SELECT e FROM EnrollmentJpaEntity e JOIN FETCH e.learningClass lc WHERE lc.courseId IN :courseIds")
    List<EnrollmentJpaEntity> findByLearningClass_CourseIdIn(@Param("courseIds") List<UUID> courseIds);

    /**
     * SOTA: Find enrollment by studentId and courseId in ONE query.
     * Eliminates N+1 loop pattern where we iterate classes to find enrollment.
     * Pattern: Direct JOIN through learningClass to courseId.
     */
    @Query("""
        SELECT e FROM EnrollmentJpaEntity e
        JOIN FETCH e.learningClass lc
        WHERE e.studentId = :studentId
        AND lc.courseId = :courseId
    """)
    Optional<EnrollmentJpaEntity> findByStudentIdAndCourseId(
            @Param("studentId") UUID studentId,
            @Param("courseId") UUID courseId
    );

    /**
     * Check if student is enrolled in a course (boolean only, avoids loading entity into persistence context).
     * Use this in write transactions to prevent @UpdateTimestamp dirty-check issues.
     */
    @Query("""
        SELECT COUNT(e) > 0 FROM EnrollmentJpaEntity e
        JOIN e.learningClass lc
        WHERE e.studentId = :studentId
        AND lc.courseId = :courseId
        AND e.status = 'ACTIVE'
    """)
    boolean existsByStudentIdAndCourseId(
            @Param("studentId") UUID studentId,
            @Param("courseId") UUID courseId
    );

    @Query("""
        SELECT e FROM EnrollmentJpaEntity e
        JOIN FETCH e.learningClass lc
        WHERE e.studentId = :studentId
        AND lc.courseId IN :courseIds
        ORDER BY e.enrolledAt DESC NULLS LAST
    """)
    List<EnrollmentJpaEntity> findByStudentIdAndCourseIds(
            @Param("studentId") UUID studentId,
            @Param("courseIds") List<UUID> courseIds
    );

    @Query("""
        SELECT COUNT(e) > 0 FROM EnrollmentJpaEntity e
        JOIN e.learningClass lc
        WHERE e.studentId = :studentId
        AND lc.courseId IN :courseIds
    """)
    boolean existsByStudentIdAndCourseIds(
            @Param("studentId") UUID studentId,
            @Param("courseIds") List<UUID> courseIds
    );

    // === Analytics queries ===

    @Query("SELECT COUNT(e) FROM EnrollmentJpaEntity e WHERE e.studentId = :studentId AND e.status = 'ACTIVE'")
    long countActiveByStudentId(@Param("studentId") UUID studentId);

    @Query("SELECT COUNT(e) FROM EnrollmentJpaEntity e WHERE e.studentId = :studentId AND e.status = 'COMPLETED'")
    long countCompletedByStudentId(@Param("studentId") UUID studentId);

    @Query("SELECT COALESCE(AVG(e.completionPercent), 0) FROM EnrollmentJpaEntity e WHERE e.studentId = :studentId AND e.status = 'ACTIVE'")
    double getAverageCompletionByStudentId(@Param("studentId") UUID studentId);

    @Query("SELECT COUNT(DISTINCT e.studentId) FROM EnrollmentJpaEntity e JOIN e.learningClass lc WHERE lc.courseId IN :courseIds")
    long countDistinctStudentsByCourseIds(@Param("courseIds") List<UUID> courseIds);

    @Query("""
        SELECT lc.courseId, COUNT(DISTINCT e.studentId)
        FROM EnrollmentJpaEntity e
        JOIN e.learningClass lc
        WHERE lc.courseId IN :courseIds
        GROUP BY lc.courseId
    """)
    List<Object[]> countDistinctStudentsGroupedByCourseIds(@Param("courseIds") List<UUID> courseIds);

    @Query("SELECT lc.courseId, COUNT(e) FROM EnrollmentJpaEntity e JOIN e.learningClass lc WHERE lc.courseId IN :courseIds GROUP BY lc.courseId")
    List<Object[]> countEnrollmentsByCourseIds(@Param("courseIds") List<UUID> courseIds);

    @Query("""
        SELECT e.studentId, COUNT(DISTINCT lc.courseId)
        FROM EnrollmentJpaEntity e
        JOIN e.learningClass lc
        WHERE e.studentId IN :studentIds
        AND e.status = 'ACTIVE'
        GROUP BY e.studentId
    """)
    List<Object[]> countDistinctActiveCoursesByStudentIds(@Param("studentIds") java.util.Collection<UUID> studentIds);

    @Query("SELECT COUNT(e) FROM EnrollmentJpaEntity e JOIN e.learningClass lc WHERE lc.courseId IN :courseIds")
    long countTotalByCourseIds(@Param("courseIds") List<UUID> courseIds);

    /**
     * Find all enrollments for given course IDs (across all classes).
     * Used for Option B: find students already enrolled when assigning paid students.
     */
    @Query("SELECT e FROM EnrollmentJpaEntity e JOIN e.learningClass lc WHERE lc.courseId IN :courseIds")
    List<EnrollmentJpaEntity> findByCourseIds(@Param("courseIds") List<UUID> courseIds);
}

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

    @Query("SELECT e FROM EnrollmentJpaEntity e WHERE e.studentId = :studentId")
    List<EnrollmentJpaEntity> findByStudentId(@Param("studentId") UUID studentId);

    @Query("SELECT e FROM EnrollmentJpaEntity e WHERE e.studentId = :studentId AND e.status = 'ACTIVE'")
    List<EnrollmentJpaEntity> findActiveByStudentId(@Param("studentId") UUID studentId);

    @Query("SELECT e FROM EnrollmentJpaEntity e WHERE e.learningClass.id = :classId")
    Page<EnrollmentJpaEntity> findByClassId(@Param("classId") UUID classId, Pageable pageable);

    @Query("SELECT e FROM EnrollmentJpaEntity e WHERE e.learningClass.id = :classId")
    List<EnrollmentJpaEntity> findAllByClassId(@Param("classId") UUID classId);

    @Query("SELECT COUNT(e) FROM EnrollmentJpaEntity e WHERE e.learningClass.id = :classId")
    long countByClassId(@Param("classId") UUID classId);

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

    // Find all enrollments for a course (via learning classes)
    @Query("SELECT e FROM EnrollmentJpaEntity e WHERE e.learningClass.courseId = :courseId")
    List<EnrollmentJpaEntity> findByLearningClass_CourseId(@Param("courseId") UUID courseId);

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
}

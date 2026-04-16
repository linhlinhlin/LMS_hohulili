package com.example.lms.learning_delivery.infrastructure.persistence;

import com.example.lms.learning_delivery.infrastructure.persistence.entity.ClassTeacherJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClassTeacherJpaRepository extends JpaRepository<ClassTeacherJpaEntity, UUID> {

    List<ClassTeacherJpaEntity> findByClassId(UUID classId);

    List<ClassTeacherJpaEntity> findByTeacherId(UUID teacherId);

    Optional<ClassTeacherJpaEntity> findByClassIdAndTeacherId(UUID classId, UUID teacherId);

    boolean existsByClassIdAndTeacherId(UUID classId, UUID teacherId);

    void deleteByClassIdAndTeacherId(UUID classId, UUID teacherId);

    long countByClassId(UUID classId);

    /**
     * Check if a teacher is assigned to any class within a course.
     * Used for co-teacher permission checks — allows co-teachers to access class endpoints.
     */
    @Query("""
        SELECT CASE WHEN COUNT(ct) > 0 THEN true ELSE false END
        FROM ClassTeacherJpaEntity ct
        WHERE ct.teacherId = :teacherId
        AND ct.classId IN (SELECT lc.id FROM LearningClassJpaEntity lc WHERE lc.courseId = :courseId)
    """)
    boolean existsByTeacherIdAndCourseId(@Param("teacherId") UUID teacherId, @Param("courseId") UUID courseId);
}

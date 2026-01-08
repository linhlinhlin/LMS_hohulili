package com.example.lms.learning_delivery.infrastructure.persistence;

import com.example.lms.learning_delivery.domain.model.LearningClass;
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
 * Spring Data JPA repository for LearningClass entity.
 */
@Repository
public interface JpaLearningClassRepository extends JpaRepository<LearningClass, UUID> {

    Optional<LearningClass> findByCode(String code);

    boolean existsByCode(String code);

    @Query("SELECT lc FROM LearningClass lc WHERE lc.courseId = :courseId")
    List<LearningClass> findByCourseId(@Param("courseId") UUID courseId);

    @Query("SELECT lc FROM LearningClass lc WHERE lc.courseId = :courseId AND lc.status = 'OPEN'")
    List<LearningClass> findOpenByCourseId(@Param("courseId") UUID courseId);

    @Query("SELECT lc FROM LearningClass lc WHERE lc.teacherId = :teacherId")
    Page<LearningClass> findByTeacherId(@Param("teacherId") UUID teacherId, Pageable pageable);

    @Query("SELECT COUNT(lc) FROM LearningClass lc WHERE lc.courseId = :courseId")
    long countByCourseId(@Param("courseId") UUID courseId);
}

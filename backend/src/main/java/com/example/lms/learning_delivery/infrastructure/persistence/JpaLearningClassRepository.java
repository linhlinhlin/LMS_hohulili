package com.example.lms.learning_delivery.infrastructure.persistence;

import com.example.lms.learning_delivery.infrastructure.persistence.entity.LearningClassJpaEntity;
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
 * Uses JPA Entity (infrastructure layer), NOT domain model.
 */
@Repository
public interface JpaLearningClassRepository extends JpaRepository<LearningClassJpaEntity, UUID> {

    Optional<LearningClassJpaEntity> findByCode(String code);

    boolean existsByCode(String code);

    @Query("SELECT lc FROM LearningClassJpaEntity lc WHERE lc.courseId = :courseId")
    List<LearningClassJpaEntity> findByCourseId(@Param("courseId") UUID courseId);

    @Query("SELECT lc FROM LearningClassJpaEntity lc WHERE lc.courseId = :courseId AND lc.status = 'OPEN'")
    List<LearningClassJpaEntity> findOpenByCourseId(@Param("courseId") UUID courseId);

    @Query("SELECT lc FROM LearningClassJpaEntity lc WHERE lc.teacherId = :teacherId")
    Page<LearningClassJpaEntity> findByTeacherId(@Param("teacherId") UUID teacherId, Pageable pageable);

    @Query("SELECT COUNT(lc) FROM LearningClassJpaEntity lc WHERE lc.courseId = :courseId")
    long countByCourseId(@Param("courseId") UUID courseId);

    @Query("SELECT lc FROM LearningClassJpaEntity lc WHERE lc.courseId = :courseId AND lc.name = :name")
    Optional<LearningClassJpaEntity> findByCourseIdAndName(@Param("courseId") UUID courseId, @Param("name") String name);

    @Query("SELECT lc FROM LearningClassJpaEntity lc WHERE lc.courseId = :courseId " +
           "AND (:search IS NULL OR LOWER(lc.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(lc.code) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:status IS NULL OR lc.status = :status)")
    Page<LearningClassJpaEntity> searchByCourseId(
            @Param("courseId") UUID courseId,
            @Param("search") String search,
            @Param("status") LearningClassJpaEntity.ClassStatus status,
            Pageable pageable);
}

package com.example.lms.course_authoring.infrastructure.persistence.repository;

import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
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
 * Spring Data JPA Repository for CourseJpaEntity.
 * 
 * This is an INFRASTRUCTURE component - should only be used by the adapter,
 * not directly by application or domain layers.
 */
@Repository
public interface CourseJpaRepositoryV2 extends JpaRepository<CourseJpaEntity, UUID> {

    Optional<CourseJpaEntity> findByCode(String code);

    boolean existsByCode(String code);

    List<CourseJpaEntity> findByTeacherId(UUID teacherId);

    Page<CourseJpaEntity> findByTeacherId(UUID teacherId, Pageable pageable);

    List<CourseJpaEntity> findByStatus(CourseJpaEntity.CourseStatus status);

    Page<CourseJpaEntity> findByStatus(CourseJpaEntity.CourseStatus status, Pageable pageable);

    @Query("SELECT c FROM CourseJpaEntity c WHERE c.status = :status AND c.visibility = :visibility")
    List<CourseJpaEntity> findByStatusAndVisibility(
            @Param("status") CourseJpaEntity.CourseStatus status,
            @Param("visibility") CourseJpaEntity.Visibility visibility
    );

    @Query("SELECT c FROM CourseJpaEntity c WHERE " +
           "(LOWER(c.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(c.description) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<CourseJpaEntity> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    long countByTeacherId(UUID teacherId);

    long countByStatus(CourseJpaEntity.CourseStatus status);
}

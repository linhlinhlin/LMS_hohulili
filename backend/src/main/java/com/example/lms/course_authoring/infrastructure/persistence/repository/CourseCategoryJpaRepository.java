package com.example.lms.course_authoring.infrastructure.persistence.repository;

import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseCategoryJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseCategoryJpaRepository extends JpaRepository<CourseCategoryJpaEntity, UUID> {

    List<CourseCategoryJpaEntity> findByParentIdIsNullOrderBySortOrder();

    List<CourseCategoryJpaEntity> findByParentIdOrderBySortOrder(UUID parentId);

    @Query("SELECT c FROM CourseCategoryJpaEntity c ORDER BY c.parentId NULLS FIRST, c.sortOrder")
    List<CourseCategoryJpaEntity> findAllOrdered();

    List<CourseCategoryJpaEntity> findByActiveTrue();

    boolean existsByCode(String code);

    boolean existsBySlug(String slug);

    boolean existsByPrefix(String prefix);

    Optional<CourseCategoryJpaEntity> findByCode(String code);

    Optional<CourseCategoryJpaEntity> findBySlug(String slug);
}

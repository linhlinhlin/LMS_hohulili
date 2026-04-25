package com.example.lms.course_authoring.infrastructure.persistence.repository;

import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseCategoryJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity.CourseStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    /**
     * Count APPROVED courses per category (issue #189, F-CAT2).
     *
     * <p>Returns rows of {@code [categoryId, count]} so the application layer
     * can populate a {@code Map<UUID, Long>} in O(1) lookup. Categories with
     * zero published courses are simply absent from the result and default to
     * 0 in the map.
     *
     * <p>Domain rule: only {@code APPROVED} courses count toward the
     * category's public-facing badge — DRAFT / PENDING / REJECTED courses are
     * not visible to learners and would inflate the number misleadingly.
     */
    @Query("SELECT c.categoryId, COUNT(c) " +
            "FROM CourseJpaEntity c " +
            "WHERE c.categoryId IS NOT NULL " +
            "  AND c.status = :status " +
            "GROUP BY c.categoryId")
    List<Object[]> countCoursesByCategoryGroupedByStatus(@Param("status") CourseStatus status);
}

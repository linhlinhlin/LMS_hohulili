package com.example.lms.course_authoring.infrastructure.persistence.repository;

import com.example.lms.course_authoring.infrastructure.persistence.entity.ChapterJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA Repository for Chapter.
 */
@Repository
public interface ChapterJpaRepository extends JpaRepository<ChapterJpaEntity, UUID> {

    List<ChapterJpaEntity> findByCourseIdOrderByOrderIndex(UUID courseId);

    Optional<ChapterJpaEntity> findByCourseIdAndOrderIndex(UUID courseId, Integer orderIndex);

    long countByCourseId(UUID courseId);

    List<ChapterJpaEntity> findByCourseIdInOrderByOrderIndex(List<UUID> courseIds);

    @Query("SELECT c.courseId, COUNT(c) FROM ChapterJpaEntity c WHERE c.courseId IN :courseIds GROUP BY c.courseId")
    List<Object[]> countByCourseIds(@Param("courseIds") List<UUID> courseIds);
}

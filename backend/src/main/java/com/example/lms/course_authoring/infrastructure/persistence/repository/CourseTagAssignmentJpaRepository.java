package com.example.lms.course_authoring.infrastructure.persistence.repository;

import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseTagAssignmentJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CourseTagAssignmentJpaRepository
        extends JpaRepository<CourseTagAssignmentJpaEntity, CourseTagAssignmentJpaEntity.CourseTagAssignmentId> {

    List<CourseTagAssignmentJpaEntity> findByCourseId(UUID courseId);

    @Modifying
    @Query("DELETE FROM CourseTagAssignmentJpaEntity a WHERE a.courseId = :courseId")
    void deleteAllByCourseId(@Param("courseId") UUID courseId);

    @Query("SELECT a.tagId FROM CourseTagAssignmentJpaEntity a WHERE a.courseId = :courseId")
    List<UUID> findTagIdsByCourseId(@Param("courseId") UUID courseId);

    long countByCourseId(UUID courseId);
}

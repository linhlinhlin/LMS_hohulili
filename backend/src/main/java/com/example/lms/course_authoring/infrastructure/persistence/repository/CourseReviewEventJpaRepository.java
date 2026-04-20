package com.example.lms.course_authoring.infrastructure.persistence.repository;

import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseReviewEventJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface CourseReviewEventJpaRepository extends JpaRepository<CourseReviewEventJpaEntity, UUID> {

    List<CourseReviewEventJpaEntity> findByCourseIdOrderByCreatedAtDesc(UUID courseId);

    List<CourseReviewEventJpaEntity> findByCourseIdInOrderByCreatedAtDesc(Collection<UUID> courseIds);
}

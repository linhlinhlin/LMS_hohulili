package com.example.lms.course_authoring.infrastructure.persistence.repository;

import com.example.lms.course_authoring.infrastructure.persistence.entity.CoursePublicationJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CoursePublicationJpaRepository extends JpaRepository<CoursePublicationJpaEntity, UUID> {

    Optional<CoursePublicationJpaEntity> findTopByCourseIdOrderByPublicationNumberDesc(UUID courseId);

    long countByCourseId(UUID courseId);
}

package com.example.lms.course_authoring.infrastructure.persistence.repository;

import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseTagJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseTagJpaRepository extends JpaRepository<CourseTagJpaEntity, UUID> {

    boolean existsByName(String name);

    boolean existsBySlug(String slug);

    Optional<CourseTagJpaEntity> findByName(String name);

    List<CourseTagJpaEntity> findAllByOrderByNameAsc();
}

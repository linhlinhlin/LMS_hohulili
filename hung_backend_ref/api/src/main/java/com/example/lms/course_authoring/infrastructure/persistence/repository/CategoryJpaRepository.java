package com.example.lms.course_authoring.infrastructure.persistence.repository;

import com.example.lms.course_authoring.infrastructure.persistence.entity.CategoryJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA Repository for Category.
 */
@Repository
public interface CategoryJpaRepository extends JpaRepository<CategoryJpaEntity, UUID> {

    Optional<CategoryJpaEntity> findByCode(String code);

    boolean existsByCode(String code);
}

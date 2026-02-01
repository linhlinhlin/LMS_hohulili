package com.example.lms.course_management.infrastructure.persistence;

import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.UUID;

/**
 * JPA Repository for Course persistence.
 * 
 * DDD Infrastructure Layer:
 * - Uses CourseJpaEntity (infrastructure) NOT Course domain model
 * - Mappers convert between JpaEntity and Domain model
 */
@Repository
public interface JpaCourseManagementRepository extends JpaRepository<CourseJpaEntity, UUID> {
    
    boolean existsByCode(String code);
    
    Page<CourseJpaEntity> findByTeacherId(UUID teacherId, Pageable pageable);
    
    // Find Course by related entities - needs JPQL with proper entity name
    @Query("SELECT c FROM CourseJpaEntity c WHERE c.id = :id")
    java.util.Optional<CourseJpaEntity> findCourseById(UUID id);
}

package com.example.lms.course_authoring.infrastructure.persistence;

import com.example.lms.course_authoring.domain.model.Course;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for Course entity.
 */
@Repository
public interface JpaCourseRepository extends JpaRepository<Course, UUID> {

    @Query("SELECT c FROM Course c WHERE c.code.value = :code")
    Optional<Course> findByCodeValue(@Param("code") String code);

    @Query("SELECT COUNT(c) > 0 FROM Course c WHERE c.code.value = :code")
    boolean existsByCodeValue(@Param("code") String code);

    @Query("SELECT c FROM Course c LEFT JOIN FETCH c.chapters ch LEFT JOIN FETCH ch.lessons WHERE c.id = :id")
    Optional<Course> findByIdWithContent(@Param("id") UUID id);

    Page<Course> findByTeacherId(UUID teacherId, Pageable pageable);

    Page<Course> findByStatus(Course.CourseStatus status, Pageable pageable);

    @Query("SELECT c FROM Course c WHERE c.status = :status AND LOWER(c.title) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Course> findByStatusAndTitleContaining(
            @Param("status") Course.CourseStatus status,
            @Param("search") String search,
            Pageable pageable);

    long countByTeacherId(UUID teacherId);

    long countByStatus(Course.CourseStatus status);
}

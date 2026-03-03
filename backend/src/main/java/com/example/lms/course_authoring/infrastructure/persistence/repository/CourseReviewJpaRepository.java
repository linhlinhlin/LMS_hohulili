package com.example.lms.course_authoring.infrastructure.persistence.repository;

import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseReviewJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseReviewJpaRepository extends JpaRepository<CourseReviewJpaEntity, UUID> {

    List<CourseReviewJpaEntity> findByCourseIdOrderByCreatedAtDesc(UUID courseId);

    Optional<CourseReviewJpaEntity> findByCourseIdAndStudentId(UUID courseId, UUID studentId);

    @Query("SELECT AVG(r.rating) FROM CourseReviewJpaEntity r WHERE r.courseId = :courseId")
    Double getAverageRatingByCourseId(@Param("courseId") UUID courseId);

    @Query("SELECT r.courseId, AVG(r.rating) FROM CourseReviewJpaEntity r WHERE r.courseId IN :courseIds GROUP BY r.courseId")
    List<Object[]> getAverageRatingsByCourseIds(@Param("courseIds") List<UUID> courseIds);

    @Query("SELECT AVG(r.rating) FROM CourseReviewJpaEntity r WHERE r.courseId IN :courseIds")
    Double getWeightedAverageRatingByCourseIds(@Param("courseIds") List<UUID> courseIds);

    long countByCourseId(UUID courseId);
}

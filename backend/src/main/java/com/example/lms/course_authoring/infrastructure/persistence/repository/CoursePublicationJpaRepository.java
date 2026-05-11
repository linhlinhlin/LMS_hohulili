package com.example.lms.course_authoring.infrastructure.persistence.repository;

import com.example.lms.course_authoring.infrastructure.persistence.entity.CoursePublicationJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CoursePublicationJpaRepository extends JpaRepository<CoursePublicationJpaEntity, UUID> {

    Optional<CoursePublicationJpaEntity> findTopByCourseIdOrderByPublicationNumberDesc(UUID courseId);

    long countByCourseId(UUID courseId);

    List<CoursePublicationJpaEntity> findByCourseIdOrderByPublicationNumberDesc(UUID courseId);

    @Query("""
            SELECT publication
            FROM CoursePublicationJpaEntity publication
            WHERE publication.courseId IN :courseIds
              AND publication.publicationNumber = (
                  SELECT MAX(latest.publicationNumber)
                  FROM CoursePublicationJpaEntity latest
                  WHERE latest.courseId = publication.courseId
              )
            """)
    List<CoursePublicationJpaEntity> findLatestByCourseIdIn(@Param("courseIds") Collection<UUID> courseIds);
}

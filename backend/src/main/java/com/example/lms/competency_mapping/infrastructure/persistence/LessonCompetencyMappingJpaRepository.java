package com.example.lms.competency_mapping.infrastructure.persistence;

import com.example.lms.competency_mapping.infrastructure.persistence.entity.LessonCompetencyMappingJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Repository
public interface LessonCompetencyMappingJpaRepository extends JpaRepository<LessonCompetencyMappingJpaEntity, UUID> {

    List<LessonCompetencyMappingJpaEntity> findByLessonId(UUID lessonId);

    @Query("SELECT m FROM LessonCompetencyMappingJpaEntity m WHERE m.lessonId IN :lessonIds")
    List<LessonCompetencyMappingJpaEntity> findByLessonIdIn(@Param("lessonIds") List<UUID> lessonIds);

    @Modifying
    @Query("""
            DELETE FROM LessonCompetencyMappingJpaEntity m
            WHERE m.lessonId = :lessonId AND m.competencyId IN :competencyIds
            """)
    void deleteByLessonIdAndCompetencyIdIn(@Param("lessonId") UUID lessonId,
                                            @Param("competencyIds") Set<UUID> competencyIds);
}

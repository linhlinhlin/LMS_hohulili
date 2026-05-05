package com.example.lms.competency_mapping.domain.repository;

import com.example.lms.competency_mapping.domain.model.LessonCompetencyMapping;

import java.util.List;
import java.util.Set;
import java.util.UUID;

public interface LessonCompetencyMappingRepository {
    List<LessonCompetencyMapping> findByLessonId(UUID lessonId);
    List<LessonCompetencyMapping> findByLessonIds(List<UUID> lessonIds);
    LessonCompetencyMapping save(LessonCompetencyMapping mapping);
    void saveAll(List<LessonCompetencyMapping> mappings);
    void deleteByLessonIdAndCompetencyIdIn(UUID lessonId, Set<UUID> competencyIds);
}

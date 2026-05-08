package com.example.lms.competency_mapping.infrastructure.persistence;

import com.example.lms.competency_mapping.domain.model.LessonCompetencyMapping;
import com.example.lms.competency_mapping.domain.repository.LessonCompetencyMappingRepository;
import com.example.lms.competency_mapping.infrastructure.persistence.mapper.CompetencyMapper;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Component
public class LessonCompetencyMappingRepositoryAdapter implements LessonCompetencyMappingRepository {

    private final LessonCompetencyMappingJpaRepository jpaRepo;
    private final CompetencyMapper mapper;

    public LessonCompetencyMappingRepositoryAdapter(LessonCompetencyMappingJpaRepository jpaRepo,
                                                     CompetencyMapper mapper) {
        this.jpaRepo = jpaRepo;
        this.mapper = mapper;
    }

    @Override
    public List<LessonCompetencyMapping> findByLessonId(UUID lessonId) {
        return jpaRepo.findByLessonId(lessonId).stream()
                .map(mapper::toDomain).toList();
    }

    @Override
    public List<LessonCompetencyMapping> findByLessonIds(List<UUID> lessonIds) {
        if (lessonIds == null || lessonIds.isEmpty()) return List.of();
        return jpaRepo.findByLessonIdIn(lessonIds).stream()
                .map(mapper::toDomain).toList();
    }

    @Override
    public LessonCompetencyMapping save(LessonCompetencyMapping mapping) {
        var saved = jpaRepo.save(mapper.toEntity(mapping));
        return mapper.toDomain(saved);
    }

    @Override
    public void saveAll(List<LessonCompetencyMapping> mappings) {
        var entities = mappings.stream().map(mapper::toEntity).toList();
        jpaRepo.saveAll(entities);
    }

    @Override
    public void deleteByLessonIdAndCompetencyIdIn(UUID lessonId, Set<UUID> competencyIds) {
        if (competencyIds == null || competencyIds.isEmpty()) return;
        jpaRepo.deleteByLessonIdAndCompetencyIdIn(lessonId, competencyIds);
    }
}

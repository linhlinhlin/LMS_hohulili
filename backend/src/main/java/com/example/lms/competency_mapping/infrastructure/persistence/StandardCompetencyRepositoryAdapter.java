package com.example.lms.competency_mapping.infrastructure.persistence;

import com.example.lms.competency_mapping.domain.model.StandardCompetency;
import com.example.lms.competency_mapping.domain.repository.StandardCompetencyRepository;
import com.example.lms.competency_mapping.infrastructure.persistence.mapper.CompetencyMapper;
import com.example.lms.shared.exception.EntityNotFoundException;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
public class StandardCompetencyRepositoryAdapter implements StandardCompetencyRepository {

    private final StandardCompetencyJpaRepository jpaRepo;
    private final CompetencyMapper mapper;

    public StandardCompetencyRepositoryAdapter(StandardCompetencyJpaRepository jpaRepo,
                                                CompetencyMapper mapper) {
        this.jpaRepo = jpaRepo;
        this.mapper = mapper;
    }

    @Override
    public List<StandardCompetency> findByStandardId(UUID standardId) {
        return jpaRepo.findByStandardIdAndActiveTrueOrderByDisplayOrderAsc(standardId)
                .stream().map(mapper::toDomain).toList();
    }

    @Override
    public List<StandardCompetency> findByStandardIdAndCategory(UUID standardId, String category) {
        return jpaRepo.findByStandardIdAndCategoryAndActiveTrueOrderByDisplayOrderAsc(standardId, category)
                .stream().map(mapper::toDomain).toList();
    }

    @Override
    public List<StandardCompetency> findByIds(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) return List.of();
        return jpaRepo.findActiveByIds(ids).stream()
                .map(mapper::toDomain).toList();
    }

    @Override
    public List<StandardCompetency> findAllActive() {
        return jpaRepo.findByActiveTrueOrderByDisplayOrderAsc()
                .stream().map(mapper::toDomain).toList();
    }

    @Override
    public int countActiveByStandardId(UUID standardId) {
        return jpaRepo.countActiveByStandardId(standardId);
    }

    @Override
    public StandardCompetency findById(UUID id) {
        return jpaRepo.findById(id)
                .map(mapper::toDomain)
                .orElseThrow(() -> new EntityNotFoundException("StandardCompetency", id));
    }
}

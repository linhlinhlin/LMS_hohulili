package com.example.lms.competency_mapping.infrastructure.persistence;

import com.example.lms.competency_mapping.domain.model.MaritimeStandard;
import com.example.lms.competency_mapping.domain.repository.MaritimeStandardRepository;
import com.example.lms.competency_mapping.infrastructure.persistence.mapper.CompetencyMapper;
import com.example.lms.shared.exception.EntityNotFoundException;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
public class MaritimeStandardRepositoryAdapter implements MaritimeStandardRepository {

    private final MaritimeStandardJpaRepository jpaRepo;
    private final CompetencyMapper mapper;

    public MaritimeStandardRepositoryAdapter(MaritimeStandardJpaRepository jpaRepo,
                                              CompetencyMapper mapper) {
        this.jpaRepo = jpaRepo;
        this.mapper = mapper;
    }

    @Override
    public List<MaritimeStandard> findAllActive() {
        return jpaRepo.findAllByActiveTrue().stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    public List<MaritimeStandard> findAll() {
        return jpaRepo.findAll().stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    public MaritimeStandard findById(UUID id) {
        return jpaRepo.findById(id)
                .map(mapper::toDomain)
                .orElseThrow(() -> new EntityNotFoundException("MaritimeStandard", id));
    }
}

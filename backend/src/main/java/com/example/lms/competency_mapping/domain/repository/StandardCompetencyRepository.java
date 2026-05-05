package com.example.lms.competency_mapping.domain.repository;

import com.example.lms.competency_mapping.domain.model.StandardCompetency;

import java.util.List;
import java.util.UUID;

public interface StandardCompetencyRepository {
    List<StandardCompetency> findByStandardId(UUID standardId);
    List<StandardCompetency> findByStandardIdAndCategory(UUID standardId, String category);
    List<StandardCompetency> findByIds(List<UUID> ids);
    int countActiveByStandardId(UUID standardId);
    StandardCompetency findById(UUID id);
}

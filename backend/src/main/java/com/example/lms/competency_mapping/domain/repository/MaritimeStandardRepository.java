package com.example.lms.competency_mapping.domain.repository;

import com.example.lms.competency_mapping.domain.model.MaritimeStandard;

import java.util.List;
import java.util.UUID;

public interface MaritimeStandardRepository {
    List<MaritimeStandard> findAllActive();
    List<MaritimeStandard> findAll();
    MaritimeStandard findById(UUID id);
}

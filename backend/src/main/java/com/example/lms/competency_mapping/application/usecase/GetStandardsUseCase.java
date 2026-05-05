package com.example.lms.competency_mapping.application.usecase;

import com.example.lms.competency_mapping.application.dto.StandardResponse;
import com.example.lms.competency_mapping.domain.repository.MaritimeStandardRepository;
import com.example.lms.competency_mapping.domain.repository.StandardCompetencyRepository;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class GetStandardsUseCase {

    private final MaritimeStandardRepository standardRepository;
    private final StandardCompetencyRepository competencyRepository;

    public GetStandardsUseCase(MaritimeStandardRepository standardRepository,
                                StandardCompetencyRepository competencyRepository) {
        this.standardRepository = standardRepository;
        this.competencyRepository = competencyRepository;
    }

    public List<StandardResponse> execute(boolean activeOnly) {
        var standards = activeOnly
                ? standardRepository.findAllActive()
                : standardRepository.findAll();

        return standards.stream()
                .map(s -> new StandardResponse(
                        s.getId(),
                        s.getCode(),
                        s.getName(),
                        s.getDescription(),
                        competencyRepository.countActiveByStandardId(s.getId())
                ))
                .toList();
    }
}

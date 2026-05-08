package com.example.lms.competency_mapping.application.usecase;

import com.example.lms.competency_mapping.application.dto.CompetencyResponse;
import com.example.lms.competency_mapping.domain.repository.MaritimeStandardRepository;
import com.example.lms.competency_mapping.domain.repository.StandardCompetencyRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
public class GetCompetenciesUseCase {

    private final MaritimeStandardRepository standardRepository;
    private final StandardCompetencyRepository competencyRepository;

    public GetCompetenciesUseCase(MaritimeStandardRepository standardRepository,
                                   StandardCompetencyRepository competencyRepository) {
        this.standardRepository = standardRepository;
        this.competencyRepository = competencyRepository;
    }

    public List<CompetencyResponse> execute(UUID standardId, String category) {
        var standard = standardRepository.findById(standardId);
        if (standard == null) {
            throw new EntityNotFoundException("MaritimeStandard", standardId);
        }

        var competencies = (category != null && !category.isBlank())
                ? competencyRepository.findByStandardIdAndCategory(standardId, category)
                : competencyRepository.findByStandardId(standardId);

        return competencies.stream()
                .map(c -> new CompetencyResponse(
                        c.getId(),
                        c.getStandardId(),
                        standard.getCode(),
                        c.getCode(),
                        c.getTitle(),
                        c.getDescription(),
                        c.getCategory(),
                        c.getDisplayOrder()
                ))
                .toList();
    }
}

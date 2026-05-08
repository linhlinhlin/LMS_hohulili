package com.example.lms.competency_mapping.application.usecase;

import com.example.lms.competency_mapping.application.dto.CompetencyResponse;
import com.example.lms.competency_mapping.domain.model.LessonCompetencyMapping;
import com.example.lms.competency_mapping.domain.repository.LessonCompetencyMappingRepository;
import com.example.lms.competency_mapping.domain.repository.MaritimeStandardRepository;
import com.example.lms.competency_mapping.domain.repository.StandardCompetencyRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
public class GetLessonCompetenciesUseCase {

    private final LessonCompetencyMappingRepository mappingRepository;
    private final StandardCompetencyRepository competencyRepository;
    private final MaritimeStandardRepository standardRepository;

    public GetLessonCompetenciesUseCase(LessonCompetencyMappingRepository mappingRepository,
                                         StandardCompetencyRepository competencyRepository,
                                         MaritimeStandardRepository standardRepository) {
        this.mappingRepository = mappingRepository;
        this.competencyRepository = competencyRepository;
        this.standardRepository = standardRepository;
    }

    public List<CompetencyResponse> execute(UUID lessonId) {
        var mappings = mappingRepository.findByLessonId(lessonId);
        if (mappings.isEmpty()) return List.of();

        var competencyIds = mappings.stream()
                .map(LessonCompetencyMapping::getCompetencyId)
                .toList();

        var competencies = competencyRepository.findByIds(competencyIds);
        var standardIds = competencies.stream()
                .map(c -> c.getStandardId())
                .distinct()
                .toList();

        var standardCodeMap = standardRepository.findAll().stream()
                .filter(s -> standardIds.contains(s.getId()))
                .collect(java.util.stream.Collectors.toMap(
                        com.example.lms.competency_mapping.domain.model.MaritimeStandard::getId,
                        com.example.lms.competency_mapping.domain.model.MaritimeStandard::getCode
                ));

        return competencies.stream()
                .map(c -> new CompetencyResponse(
                        c.getId(),
                        c.getStandardId(),
                        standardCodeMap.getOrDefault(c.getStandardId(), ""),
                        c.getCode(),
                        c.getTitle(),
                        c.getDescription(),
                        c.getCategory(),
                        c.getDisplayOrder()
                ))
                .toList();
    }
}

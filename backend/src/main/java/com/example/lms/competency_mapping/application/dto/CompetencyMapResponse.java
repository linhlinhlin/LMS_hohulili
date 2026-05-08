package com.example.lms.competency_mapping.application.dto;

import java.util.List;

public record CompetencyMapResponse(
        List<StandardResponse> standards,
        List<CompetencyResponse> competencies,
        List<LessonMappingResponse> lessons,
        CompetencyMapStats stats,
        List<String> warnings
) {}

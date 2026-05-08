package com.example.lms.competency_mapping.application.dto;

public record CompetencyMapStats(
        int totalMappings,
        int coveragePercent,
        int lessonsWithMapping,
        int totalLessons,
        int competenciesCovered,
        int totalCompetencies,
        int unmappedLessonsCount,
        int uncoveredCompetenciesCount
) {}

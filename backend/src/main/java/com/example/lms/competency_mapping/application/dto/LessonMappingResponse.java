package com.example.lms.competency_mapping.application.dto;

import java.util.List;
import java.util.UUID;

public record LessonMappingResponse(
        UUID id,
        String title,
        String chapterTitle,
        List<UUID> mappedCompetencyIds,
        String warning
) {}

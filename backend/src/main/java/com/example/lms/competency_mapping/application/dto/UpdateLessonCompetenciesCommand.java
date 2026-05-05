package com.example.lms.competency_mapping.application.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record UpdateLessonCompetenciesCommand(
        @NotNull(message = "competencyIds is required")
        List<UUID> competencyIds,

        @Size(max = 500, message = "Note must not exceed 500 characters")
        String note
) {}

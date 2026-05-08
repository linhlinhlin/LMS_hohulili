package com.example.lms.competency_mapping.application.dto;

import java.util.UUID;

public record CompetencyResponse(
        UUID id,
        UUID standardId,
        String standardCode,
        String code,
        String title,
        String description,
        String category,
        int displayOrder
) {}

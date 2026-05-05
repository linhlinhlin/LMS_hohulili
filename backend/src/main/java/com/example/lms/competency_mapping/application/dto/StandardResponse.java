package com.example.lms.competency_mapping.application.dto;

import java.util.UUID;

public record StandardResponse(
        UUID id,
        String code,
        String name,
        String description,
        int competencyCount
) {}

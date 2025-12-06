package com.example.lms.dto.ai;

/**
 * DTO cho metadata của AI response.
 * Chứa thông tin về processing time.
 */
public record MetadataDTO(
    double processingTime
) {}

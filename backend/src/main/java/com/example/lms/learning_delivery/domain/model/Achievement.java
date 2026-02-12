package com.example.lms.learning_delivery.domain.model;

import java.util.UUID;

/**
 * Achievement Domain Model (immutable value object).
 */
public record Achievement(
    UUID id,
    String code,
    String name,
    String description,
    String icon,
    String category,
    int threshold
) {}

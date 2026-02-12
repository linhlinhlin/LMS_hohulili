package com.example.lms.course_authoring.domain.model;

import java.util.UUID;

public record Category(
    UUID id,
    String code,
    String name,
    String prefix
) {}

package com.example.lms.academic.domain.model;

import com.example.lms.shared.exception.ValidationException;

import java.time.Instant;
import java.util.UUID;

public record AcademicCurriculumSubject(
        UUID id,
        UUID organizationId,
        UUID curriculumPlanId,
        UUID subjectId,
        UUID termId,
        Integer displayOrder,
        Boolean required,
        Integer creditsOverride,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
    public static AcademicCurriculumSubject create(
            UUID organizationId,
            UUID curriculumPlanId,
            UUID subjectId,
            UUID termId,
            Integer displayOrder,
            Boolean required,
            Integer creditsOverride) {
        int safeDisplayOrder = displayOrder == null ? 0 : displayOrder;
        if (curriculumPlanId == null) {
            throw new ValidationException("curriculumPlanId", "curriculumPlanId is required");
        }
        if (subjectId == null) {
            throw new ValidationException("subjectId", "subjectId is required");
        }
        if (safeDisplayOrder < 0) {
            throw new ValidationException("displayOrder", "displayOrder must be non-negative");
        }
        if (creditsOverride != null && creditsOverride < 0) {
            throw new ValidationException("creditsOverride", "creditsOverride must be non-negative");
        }
        return new AcademicCurriculumSubject(
                UUID.randomUUID(),
                organizationId,
                curriculumPlanId,
                subjectId,
                termId,
                safeDisplayOrder,
                required == null || required,
                creditsOverride,
                "ACTIVE",
                Instant.now(),
                null
        );
    }
}

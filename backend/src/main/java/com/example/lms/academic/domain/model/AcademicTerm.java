package com.example.lms.academic.domain.model;

import com.example.lms.shared.exception.ValidationException;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record AcademicTerm(
        UUID id,
        UUID organizationId,
        String code,
        String name,
        String academicYear,
        Integer termNumber,
        LocalDate startsOn,
        LocalDate endsOn,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
    public static AcademicTerm create(
            UUID organizationId,
            String code,
            String name,
            String academicYear,
            Integer termNumber,
            LocalDate startsOn,
            LocalDate endsOn) {
        int safeTermNumber = termNumber == null ? 1 : termNumber;
        if (safeTermNumber < 1 || safeTermNumber > 12) {
            throw new ValidationException("termNumber", "termNumber must be between 1 and 12");
        }
        if (startsOn != null && endsOn != null && endsOn.isBefore(startsOn)) {
            throw new ValidationException("endsOn", "endsOn must be after startsOn");
        }
        return new AcademicTerm(
                UUID.randomUUID(),
                organizationId,
                AcademicStrings.code(code),
                AcademicStrings.required("name", name),
                AcademicStrings.required("academicYear", academicYear),
                safeTermNumber,
                startsOn,
                endsOn,
                "ACTIVE",
                Instant.now(),
                null
        );
    }
}

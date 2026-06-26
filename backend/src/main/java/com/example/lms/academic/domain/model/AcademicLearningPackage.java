package com.example.lms.academic.domain.model;

import com.example.lms.shared.exception.ValidationException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;

public record AcademicLearningPackage(
        UUID id,
        UUID organizationId,
        UUID curriculumPlanId,
        String code,
        String name,
        String description,
        String packageType,
        BigDecimal price,
        String currency,
        String enrollmentPolicy,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
    private static final Set<String> PACKAGE_TYPES = Set.of("CURRICULUM_BUNDLE", "SUBJECT_BUNDLE", "COURSE_BUNDLE");
    private static final Set<String> ENROLLMENT_POLICIES = Set.of("OPEN", "ORG_APPROVAL", "PAYMENT_REQUIRED", "INVITE_ONLY");

    public static AcademicLearningPackage create(
            UUID organizationId,
            UUID curriculumPlanId,
            String code,
            String name,
            String description,
            String packageType,
            BigDecimal price,
            String currency,
            String enrollmentPolicy) {
        var safePrice = price == null ? BigDecimal.ZERO : price;
        if (safePrice.compareTo(BigDecimal.ZERO) < 0) {
            throw new ValidationException("price", "price must be non-negative");
        }
        var safeType = normalize(packageType, "CURRICULUM_BUNDLE");
        var safePolicy = normalize(enrollmentPolicy, "ORG_APPROVAL");
        if (!PACKAGE_TYPES.contains(safeType)) {
            throw new ValidationException("packageType", "Unsupported package type");
        }
        if (!ENROLLMENT_POLICIES.contains(safePolicy)) {
            throw new ValidationException("enrollmentPolicy", "Unsupported enrollment policy");
        }
        var safeCurrency = normalize(currency, "VND");
        if (!safeCurrency.matches("^[A-Z]{3}$")) {
            throw new ValidationException("currency", "currency must be a 3-letter ISO code");
        }
        return new AcademicLearningPackage(
                UUID.randomUUID(),
                organizationId,
                curriculumPlanId,
                AcademicStrings.code(code),
                AcademicStrings.required("name", name),
                description == null || description.isBlank() ? null : description.trim(),
                safeType,
                safePrice,
                safeCurrency,
                safePolicy,
                "ACTIVE",
                Instant.now(),
                null
        );
    }

    private static String normalize(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim().toUpperCase();
    }
}

package com.example.lms.academic.domain.model;

import com.example.lms.shared.domain.model.OrgPaymentConfig;
import com.example.lms.shared.exception.ValidationException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public record AcademicLearningPackageRevenueSplit(
        UUID id,
        UUID organizationId,
        UUID enrollmentId,
        UUID packageId,
        UUID packageItemId,
        UUID subjectId,
        UUID courseId,
        UUID teacherId,
        BigDecimal grossAmount,
        String currency,
        BigDecimal platformFeePct,
        BigDecimal teacherSharePct,
        BigDecimal orgSharePct,
        BigDecimal platformAmount,
        BigDecimal teacherAmount,
        BigDecimal orgAmount,
        String paymentReference,
        Instant createdAt
) {
    private static final int MAX_REFERENCE_LENGTH = 128;

    public AcademicLearningPackageRevenueSplit {
        Objects.requireNonNull(id, "id is required");
        Objects.requireNonNull(organizationId, "organizationId is required");
        Objects.requireNonNull(enrollmentId, "enrollmentId is required");
        Objects.requireNonNull(packageId, "packageId is required");
        Objects.requireNonNull(packageItemId, "packageItemId is required");
        Objects.requireNonNull(courseId, "courseId is required");
        Objects.requireNonNull(teacherId, "teacherId is required");
        grossAmount = normalizeMoney(grossAmount, "grossAmount");
        platformFeePct = normalizePct(platformFeePct, "platformFeePct");
        teacherSharePct = normalizePct(teacherSharePct, "teacherSharePct");
        orgSharePct = normalizePct(orgSharePct, "orgSharePct");
        platformAmount = normalizeMoney(platformAmount, "platformAmount");
        teacherAmount = normalizeMoney(teacherAmount, "teacherAmount");
        orgAmount = normalizeMoney(orgAmount, "orgAmount");
        currency = currency == null || currency.isBlank() ? "VND" : currency.trim().toUpperCase();
        if (!currency.matches("^[A-Z]{3}$")) {
            throw new ValidationException("currency", "package revenue currency must be a 3-letter ISO code");
        }
        paymentReference = cleanReference(paymentReference);
        createdAt = createdAt == null ? Instant.now() : createdAt;
    }

    public static AcademicLearningPackageRevenueSplit create(
            AcademicLearningPackageEnrollment enrollment,
            AcademicLearningPackageItem item,
            UUID courseId,
            UUID teacherId,
            BigDecimal grossAmount,
            OrgPaymentConfig config) {
        Objects.requireNonNull(enrollment, "enrollment is required");
        Objects.requireNonNull(item, "item is required");
        Objects.requireNonNull(config, "config is required");
        var gross = normalizeMoney(grossAmount, "grossAmount");
        var hundred = BigDecimal.valueOf(100);
        var platformAmount = gross.multiply(config.getPlatformFeePct())
                .divide(hundred, 2, RoundingMode.HALF_UP);
        var orgAmount = gross.multiply(config.getOrgSharePct())
                .divide(hundred, 2, RoundingMode.HALF_UP);
        var teacherAmount = gross.subtract(platformAmount).subtract(orgAmount).setScale(2, RoundingMode.HALF_UP);

        return new AcademicLearningPackageRevenueSplit(
                UUID.randomUUID(),
                enrollment.organizationId(),
                enrollment.id(),
                enrollment.packageId(),
                item.id(),
                item.subjectId(),
                courseId,
                teacherId,
                gross,
                enrollment.paymentCurrency(),
                config.getPlatformFeePct(),
                config.getTeacherSharePct(),
                config.getOrgSharePct(),
                platformAmount,
                teacherAmount,
                orgAmount,
                enrollment.paymentReference(),
                Instant.now());
    }

    private static BigDecimal normalizeMoney(BigDecimal value, String fieldName) {
        var safe = value == null ? BigDecimal.ZERO : value.setScale(2, RoundingMode.HALF_UP);
        if (safe.compareTo(BigDecimal.ZERO) < 0) {
            throw new ValidationException(fieldName, fieldName + " must be non-negative");
        }
        return safe;
    }

    private static BigDecimal normalizePct(BigDecimal value, String fieldName) {
        var safe = value == null ? BigDecimal.ZERO : value;
        if (safe.compareTo(BigDecimal.ZERO) < 0) {
            throw new ValidationException(fieldName, fieldName + " must be non-negative");
        }
        return safe;
    }

    private static String cleanReference(String value) {
        var clean = value == null || value.isBlank() ? null : value.trim();
        if (clean != null && clean.length() > MAX_REFERENCE_LENGTH) {
            throw new ValidationException("paymentReference", "payment reference must not exceed 128 characters");
        }
        return clean;
    }
}

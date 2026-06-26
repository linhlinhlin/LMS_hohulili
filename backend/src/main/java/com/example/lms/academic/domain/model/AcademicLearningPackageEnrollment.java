package com.example.lms.academic.domain.model;

import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.exception.ValidationException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

public record AcademicLearningPackageEnrollment(
        UUID id,
        UUID organizationId,
        UUID packageId,
        UUID studentId,
        String status,
        String decisionNote,
        BigDecimal paymentAmount,
        String paymentCurrency,
        String paymentReference,
        Instant paymentConfirmedAt,
        UUID paymentConfirmedBy,
        Instant requestedAt,
        Instant decidedAt,
        UUID decidedBy,
        Instant createdAt,
        Instant updatedAt
) {
    private static final int MAX_PAYMENT_REFERENCE_LENGTH = 128;

    private static final Set<String> STATUSES = Set.of(
            "PENDING_APPROVAL",
            "PENDING_PAYMENT",
            "ACTIVE",
            "REJECTED",
            "CANCELLED");

    public AcademicLearningPackageEnrollment {
        Objects.requireNonNull(id, "id is required");
        Objects.requireNonNull(organizationId, "organizationId is required");
        Objects.requireNonNull(packageId, "packageId is required");
        Objects.requireNonNull(studentId, "studentId is required");
        status = normalize(status, "PENDING_APPROVAL");
        if (!STATUSES.contains(status)) {
            throw new ValidationException("status", "Unsupported learning package enrollment status");
        }
        decisionNote = cleanNote(decisionNote);
        paymentAmount = paymentAmount == null ? BigDecimal.ZERO : paymentAmount;
        if (paymentAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new ValidationException("paymentAmount", "payment amount must be non-negative");
        }
        paymentCurrency = normalize(paymentCurrency, "VND");
        if (!paymentCurrency.matches("^[A-Z]{3}$")) {
            throw new ValidationException("paymentCurrency", "payment currency must be a 3-letter ISO code");
        }
        paymentReference = cleanPaymentReference(paymentReference);
    }

    public static AcademicLearningPackageEnrollment request(
            UUID organizationId,
            UUID packageId,
            UUID studentId,
            String enrollmentPolicy,
            BigDecimal paymentAmount,
            String paymentCurrency) {
        var policy = normalize(enrollmentPolicy, "ORG_APPROVAL");
        var status = switch (policy) {
            case "OPEN" -> "ACTIVE";
            case "ORG_APPROVAL" -> "PENDING_APPROVAL";
            case "PAYMENT_REQUIRED" -> "PENDING_PAYMENT";
            case "INVITE_ONLY" -> throw new BusinessRuleException(
                    "PACKAGE_INVITE_ONLY",
                    "Learning package requires an organization invitation");
            default -> throw new ValidationException("enrollmentPolicy", "Unsupported enrollment policy");
        };
        var now = Instant.now();
        return new AcademicLearningPackageEnrollment(
                UUID.randomUUID(),
                organizationId,
                packageId,
                studentId,
                status,
                null,
                paymentAmount,
                paymentCurrency,
                null,
                null,
                null,
                now,
                null,
                null,
                now,
                null);
    }

    public AcademicLearningPackageEnrollment approve(UUID approverId, String note) {
        if (!"PENDING_APPROVAL".equals(status)) {
            throw new BusinessRuleException(
                    "PACKAGE_ENROLLMENT_NOT_APPROVABLE",
                    "Only pending approval package enrollments can be approved");
        }
        return decide("ACTIVE", approverId, note);
    }

    public AcademicLearningPackageEnrollment reject(UUID approverId, String note) {
        if (!"PENDING_APPROVAL".equals(status) && !"PENDING_PAYMENT".equals(status)) {
            throw new BusinessRuleException(
                    "PACKAGE_ENROLLMENT_NOT_REJECTABLE",
                    "Only pending package enrollments can be rejected");
        }
        return decide("REJECTED", approverId, note);
    }

    public AcademicLearningPackageEnrollment completePayment(UUID confirmerId, String note, String paymentReference) {
        if (!"PENDING_PAYMENT".equals(status)) {
            throw new BusinessRuleException(
                    "PACKAGE_PAYMENT_NOT_COMPLETABLE",
                    "Only pending payment package enrollments can be completed");
        }
        Objects.requireNonNull(confirmerId, "confirmerId is required");
        var now = Instant.now();
        return new AcademicLearningPackageEnrollment(
                id,
                organizationId,
                packageId,
                studentId,
                "ACTIVE",
                note,
                paymentAmount,
                paymentCurrency,
                paymentReference,
                now,
                confirmerId,
                requestedAt,
                now,
                confirmerId,
                createdAt,
                now);
    }

    private AcademicLearningPackageEnrollment decide(String nextStatus, UUID approverId, String note) {
        Objects.requireNonNull(approverId, "approverId is required");
        var now = Instant.now();
        return new AcademicLearningPackageEnrollment(
                id,
                organizationId,
                packageId,
                studentId,
                nextStatus,
                note,
                paymentAmount,
                paymentCurrency,
                paymentReference,
                paymentConfirmedAt,
                paymentConfirmedBy,
                requestedAt,
                now,
                approverId,
                createdAt,
                now);
    }

    private static String normalize(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim().toUpperCase();
    }

    private static String cleanNote(String note) {
        return note == null || note.isBlank() ? null : note.trim();
    }

    private static String cleanPaymentReference(String reference) {
        var cleanReference = cleanNote(reference);
        if (cleanReference != null && cleanReference.length() > MAX_PAYMENT_REFERENCE_LENGTH) {
            throw new ValidationException("paymentReference", "payment reference must not exceed 128 characters");
        }
        return cleanReference;
    }
}

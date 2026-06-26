package com.example.lms.academic.domain.model;

import com.example.lms.shared.exception.ValidationException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

public record AcademicLearningPackagePaymentEvent(
        UUID id,
        UUID organizationId,
        UUID enrollmentId,
        UUID packageId,
        UUID studentId,
        String eventType,
        BigDecimal amount,
        String currency,
        String reference,
        UUID actorId,
        String note,
        Instant occurredAt,
        Instant createdAt
) {
    private static final int MAX_REFERENCE_LENGTH = 128;
    private static final Set<String> EVENT_TYPES = Set.of("QR_CREATED", "PAYMENT_CONFIRMED");

    public AcademicLearningPackagePaymentEvent {
        Objects.requireNonNull(id, "id is required");
        Objects.requireNonNull(organizationId, "organizationId is required");
        Objects.requireNonNull(enrollmentId, "enrollmentId is required");
        Objects.requireNonNull(packageId, "packageId is required");
        Objects.requireNonNull(studentId, "studentId is required");
        eventType = normalize(eventType);
        if (!EVENT_TYPES.contains(eventType)) {
            throw new ValidationException("eventType", "Unsupported learning package payment event type");
        }
        amount = amount == null ? BigDecimal.ZERO : amount;
        if (amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new ValidationException("amount", "payment event amount must be non-negative");
        }
        currency = currency == null || currency.isBlank() ? "VND" : currency.trim().toUpperCase();
        if (!currency.matches("^[A-Z]{3}$")) {
            throw new ValidationException("currency", "payment event currency must be a 3-letter ISO code");
        }
        reference = cleanReference(reference);
        note = note == null || note.isBlank() ? null : note.trim();
        occurredAt = occurredAt == null ? Instant.now() : occurredAt;
        createdAt = createdAt == null ? occurredAt : createdAt;
    }

    public static AcademicLearningPackagePaymentEvent qrCreated(
            AcademicLearningPackageEnrollment enrollment,
            UUID actorId,
            String reference) {
        return fromEnrollment(enrollment, "QR_CREATED", actorId, reference, "SePay QR generated for package tuition.");
    }

    public static AcademicLearningPackagePaymentEvent paymentConfirmed(
            AcademicLearningPackageEnrollment enrollment,
            UUID actorId,
            String reference,
            String note) {
        return fromEnrollment(enrollment, "PAYMENT_CONFIRMED", actorId, reference, note);
    }

    private static AcademicLearningPackagePaymentEvent fromEnrollment(
            AcademicLearningPackageEnrollment enrollment,
            String eventType,
            UUID actorId,
            String reference,
            String note) {
        Objects.requireNonNull(enrollment, "enrollment is required");
        return new AcademicLearningPackagePaymentEvent(
                UUID.randomUUID(),
                enrollment.organizationId(),
                enrollment.id(),
                enrollment.packageId(),
                enrollment.studentId(),
                eventType,
                enrollment.paymentAmount(),
                enrollment.paymentCurrency(),
                reference,
                actorId,
                note,
                Instant.now(),
                Instant.now());
    }

    private static String normalize(String value) {
        return value == null || value.isBlank() ? "" : value.trim().toUpperCase();
    }

    private static String cleanReference(String value) {
        var clean = value == null || value.isBlank() ? null : value.trim();
        if (clean != null && clean.length() > MAX_REFERENCE_LENGTH) {
            throw new ValidationException("reference", "payment event reference must not exceed 128 characters");
        }
        return clean;
    }
}

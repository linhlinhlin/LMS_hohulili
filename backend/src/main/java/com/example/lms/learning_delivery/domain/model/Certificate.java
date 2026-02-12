package com.example.lms.learning_delivery.domain.model;

import java.time.Instant;
import java.util.UUID;

/**
 * Certificate - Domain model for course completion certificates.
 *
 * Issued automatically when a student completes 100% of a course,
 * or manually when >= 80% complete.
 */
public class Certificate {
    private UUID id;
    private UUID enrollmentId;
    private UUID studentId;
    private UUID courseId;
    private UUID verificationToken;
    private Instant issuedAt;

    private Certificate() {}

    /**
     * Factory method to issue a new certificate.
     */
    public static Certificate issue(UUID enrollmentId, UUID studentId, UUID courseId) {
        if (enrollmentId == null) throw new IllegalArgumentException("enrollmentId is required");
        if (studentId == null) throw new IllegalArgumentException("studentId is required");
        if (courseId == null) throw new IllegalArgumentException("courseId is required");

        Certificate cert = new Certificate();
        cert.id = UUID.randomUUID();
        cert.enrollmentId = enrollmentId;
        cert.studentId = studentId;
        cert.courseId = courseId;
        cert.verificationToken = UUID.randomUUID();
        cert.issuedAt = Instant.now();
        return cert;
    }

    /**
     * Reconstitute from persistence.
     */
    public static Certificate reconstitute(UUID id, UUID enrollmentId, UUID studentId,
                                            UUID courseId, UUID verificationToken, Instant issuedAt) {
        Certificate cert = new Certificate();
        cert.id = id;
        cert.enrollmentId = enrollmentId;
        cert.studentId = studentId;
        cert.courseId = courseId;
        cert.verificationToken = verificationToken;
        cert.issuedAt = issuedAt;
        return cert;
    }

    // Getters
    public UUID getId() { return id; }
    public UUID getEnrollmentId() { return enrollmentId; }
    public UUID getStudentId() { return studentId; }
    public UUID getCourseId() { return courseId; }
    public UUID getVerificationToken() { return verificationToken; }
    public Instant getIssuedAt() { return issuedAt; }
}

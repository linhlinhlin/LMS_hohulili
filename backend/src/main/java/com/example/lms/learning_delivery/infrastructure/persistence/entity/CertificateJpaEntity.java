package com.example.lms.learning_delivery.infrastructure.persistence.entity;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "certificates")
public class CertificateJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "enrollment_id", nullable = false, unique = true)
    private UUID enrollmentId;

    @Column(name = "student_id", nullable = false)
    private UUID studentId;

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Column(name = "verification_token", unique = true)
    private UUID verificationToken;

    @Column(name = "issued_at", nullable = false)
    private Instant issuedAt;

    public CertificateJpaEntity() {}

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private UUID enrollmentId;
        private UUID studentId;
        private UUID courseId;
        private UUID verificationToken = UUID.randomUUID();
        private Instant issuedAt = Instant.now();

        public Builder enrollmentId(UUID v) { this.enrollmentId = v; return this; }
        public Builder studentId(UUID v) { this.studentId = v; return this; }
        public Builder courseId(UUID v) { this.courseId = v; return this; }
        public Builder verificationToken(UUID v) { this.verificationToken = v; return this; }
        public Builder issuedAt(Instant v) { this.issuedAt = v; return this; }

        public CertificateJpaEntity build() {
            CertificateJpaEntity e = new CertificateJpaEntity();
            e.enrollmentId = enrollmentId; e.studentId = studentId; e.courseId = courseId;
            e.verificationToken = verificationToken; e.issuedAt = issuedAt;
            return e;
        }
    }

    public UUID getId() { return id; }
    public UUID getEnrollmentId() { return enrollmentId; }
    public UUID getStudentId() { return studentId; }
    public UUID getCourseId() { return courseId; }
    public UUID getVerificationToken() { return verificationToken; }
    public Instant getIssuedAt() { return issuedAt; }
}

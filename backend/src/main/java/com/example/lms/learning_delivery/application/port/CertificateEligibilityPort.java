package com.example.lms.learning_delivery.application.port;

import java.util.UUID;

/**
 * Application port for determining whether an enrollment is eligible for certificate issuance.
 */
public interface CertificateEligibilityPort {

    EligibilityResult evaluate(UUID enrollmentId, UUID studentId, UUID courseId);

    record EligibilityResult(boolean eligible, String reason) {
        public static EligibilityResult allowed() {
            return new EligibilityResult(true, null);
        }

        public static EligibilityResult denied(String reason) {
            return new EligibilityResult(false, reason);
        }
    }
}

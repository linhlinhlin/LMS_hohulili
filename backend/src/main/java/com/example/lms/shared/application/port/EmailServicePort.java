package com.example.lms.shared.application.port;

import java.math.BigDecimal;

/**
 * Port for sending emails.
 * Adapters: SmtpEmailAdapter (dev), ResendEmailAdapter (prod).
 */
public interface EmailServicePort {

    void sendPasswordReset(String toEmail, String fullName, String resetLink);

    void sendWelcome(String toEmail, String fullName);

    void sendEnrollmentConfirmation(String toEmail, String fullName, String courseName);

    void sendPaymentReceipt(String toEmail, String fullName, String courseName, BigDecimal amount, String txnId);

    void sendEmailVerification(String toEmail, String fullName, String verificationLink);
}

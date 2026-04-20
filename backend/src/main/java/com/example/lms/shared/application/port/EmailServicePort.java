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

    void sendPaymentReceipt(String toEmail, String fullName, String courseName, BigDecimal amount,
                            String txnId, String paymentMethod, String paidAt);

    void sendEmailVerification(String toEmail, String fullName, String verificationLink);

    void sendRefundNotification(String toEmail, String fullName, String courseName,
                                BigDecimal amount, String reason, String transactionId);

    void sendOrganizationInvite(String toEmail, String organizationName, String inviteLink);

    /**
     * Notifies a teacher that their course was rejected by a reviewer.
     *
     * @param toEmail       teacher's email
     * @param fullName      teacher's display name
     * @param courseName    course title
     * @param categoryLabel Vietnamese label of the rejection category (e.g. "Nội dung chưa đầy đủ")
     * @param reason        free-text reason written by reviewer
     * @param courseUrl     absolute URL for the teacher to revisit the course editor
     */
    void sendCourseRejected(String toEmail, String fullName, String courseName,
                            String categoryLabel, String reason, String courseUrl);
}

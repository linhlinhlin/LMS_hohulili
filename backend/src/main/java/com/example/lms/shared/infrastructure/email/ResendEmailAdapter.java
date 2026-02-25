package com.example.lms.shared.infrastructure.email;

import com.example.lms.shared.application.port.EmailServicePort;
import com.resend.Resend;
import com.resend.core.exception.ResendException;
import com.resend.services.emails.model.CreateEmailOptions;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Production email adapter using Resend API.
 */
@Slf4j
@Component
@Profile("prod")
public class ResendEmailAdapter implements EmailServicePort {

    private final Resend resend;
    private final String fromAddress;

    public ResendEmailAdapter(
            @Value("${app.resend.api-key}") String apiKey,
            @Value("${app.email.from:LMS Maritime <noreply@maritime.edu>}") String fromAddress) {
        this.resend = new Resend(apiKey);
        this.fromAddress = fromAddress;
    }

    @Override
    @Async
    public void sendPasswordReset(String toEmail, String fullName, String resetLink) {
        String html = EmailTemplates.passwordReset(fullName, resetLink);
        send(toEmail, "Đặt lại mật khẩu - LMS Maritime", html);
    }

    @Override
    @Async
    public void sendWelcome(String toEmail, String fullName) {
        String html = EmailTemplates.welcome(fullName);
        send(toEmail, "Chào mừng đến LMS Maritime", html);
    }

    @Override
    @Async
    public void sendEnrollmentConfirmation(String toEmail, String fullName, String courseName) {
        String html = EmailTemplates.enrollmentConfirmation(fullName, courseName);
        send(toEmail, "Ghi danh thành công - " + courseName, html);
    }

    @Override
    @Async
    public void sendPaymentReceipt(String toEmail, String fullName, String courseName, BigDecimal amount, String txnId) {
        String html = EmailTemplates.paymentReceipt(fullName, courseName, amount, txnId);
        send(toEmail, "Biên lai thanh toán - LMS Maritime", html);
    }

    @Override
    @Async
    public void sendEmailVerification(String toEmail, String fullName, String verificationLink) {
        String html = EmailTemplates.emailVerification(fullName, verificationLink);
        send(toEmail, "Xác nhận email - LMS Maritime", html);
    }

    private void send(String to, String subject, String htmlBody) {
        try {
            CreateEmailOptions options = CreateEmailOptions.builder()
                    .from(fromAddress)
                    .to(to)
                    .subject(subject)
                    .html(htmlBody)
                    .build();
            resend.emails().send(options);
            log.info("[Email/Resend] Sent '{}' to {}", subject, to);
        } catch (ResendException e) {
            log.error("[Email/Resend] Failed to send '{}' to {}: {}", subject, to, e.getMessage());
        }
    }
}

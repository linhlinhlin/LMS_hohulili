package com.example.lms.shared.infrastructure.email;

import com.example.lms.shared.application.port.EmailServicePort;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Dev/staging email adapter using SMTP (Mailtrap, Gmail, etc.).
 */
@Slf4j
@Component
@Profile("dev")
@RequiredArgsConstructor
public class SmtpEmailAdapter implements EmailServicePort {

    private final JavaMailSender mailSender;

    @Value("${app.email.from:LMS Maritime <noreply@maritime.edu>}")
    private String fromAddress;

    @Value("${spring.mail.username:}")
    private String mailUsername;

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
        if (mailUsername == null || mailUsername.isBlank()) {
            log.warn("[Email] SMTP not configured (MAIL_USERNAME empty). Would send '{}' to {}", subject, to);
            log.debug("[Email] Content preview: {}", htmlBody.substring(0, Math.min(200, htmlBody.length())));
            return;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("[Email] Sent '{}' to {}", subject, to);
        } catch (MessagingException e) {
            log.error("[Email] Failed to send '{}' to {}: {}", subject, to, e.getMessage());
        }
    }
}

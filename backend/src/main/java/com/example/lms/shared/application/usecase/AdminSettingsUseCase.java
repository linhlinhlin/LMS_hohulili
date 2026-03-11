package com.example.lms.shared.application.usecase;

import com.example.lms.shared.application.port.AdminSettingsPort;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * Use case for system settings management.
 * Settings persisted as JSON key-value pairs via AdminSettingsPort.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminSettingsUseCase {

    private static final String MASKED = "********";
    private static final String KEY_GENERAL = "general";
    private static final String KEY_EMAIL = "email";
    private static final String KEY_PAYMENT = "payment";
    private static final String KEY_SECURITY = "security";

    private final AdminSettingsPort settingsPort;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public SettingsResponse getSettings() {
        Map<String, String> map = settingsPort.loadAll();

        GeneralSettings general = parseOrDefault(map.get(KEY_GENERAL), GeneralSettings.class, defaultGeneral());
        EmailSettings email = parseOrDefault(map.get(KEY_EMAIL), EmailSettings.class, defaultEmail());
        PaymentSettings payment = parseOrDefault(map.get(KEY_PAYMENT), PaymentSettings.class, defaultPayment());
        SecuritySettings security = parseOrDefault(map.get(KEY_SECURITY), SecuritySettings.class, defaultSecurity());

        // Mask sensitive fields in response
        email = new EmailSettings(email.smtpHost(), email.smtpPort(), email.smtpUser(),
                MASKED, email.fromEmail(), email.fromName());
        payment = new PaymentSettings(payment.stripePublicKey(), MASKED,
                payment.paypalClientId(), MASKED, payment.currency());

        return new SettingsResponse(general, email, payment, security);
    }

    @Transactional
    public SettingsResponse updateSettings(SettingsResponse settings) {
        // For email/payment: if masked value received, preserve existing secrets
        EmailSettings emailToSave = preserveEmailSecrets(settings.email());
        PaymentSettings paymentToSave = preservePaymentSecrets(settings.payment());

        saveSetting(KEY_GENERAL, settings.general());
        saveSetting(KEY_EMAIL, emailToSave);
        saveSetting(KEY_PAYMENT, paymentToSave);
        saveSetting(KEY_SECURITY, settings.security());

        log.info("Admin settings updated");
        return getSettings();
    }

    private EmailSettings preserveEmailSecrets(EmailSettings incoming) {
        if (incoming == null) return defaultEmail();
        if (!MASKED.equals(incoming.smtpPassword())) return incoming;
        EmailSettings existing = loadSetting(KEY_EMAIL, EmailSettings.class, defaultEmail());
        return new EmailSettings(incoming.smtpHost(), incoming.smtpPort(), incoming.smtpUser(),
                existing.smtpPassword(), incoming.fromEmail(), incoming.fromName());
    }

    private PaymentSettings preservePaymentSecrets(PaymentSettings incoming) {
        if (incoming == null) return defaultPayment();
        PaymentSettings existing = loadSetting(KEY_PAYMENT, PaymentSettings.class, defaultPayment());
        String stripeSecret = MASKED.equals(incoming.stripeSecretKey()) ? existing.stripeSecretKey() : incoming.stripeSecretKey();
        String paypalSecret = MASKED.equals(incoming.paypalClientSecret()) ? existing.paypalClientSecret() : incoming.paypalClientSecret();
        return new PaymentSettings(incoming.stripePublicKey(), stripeSecret,
                incoming.paypalClientId(), paypalSecret, incoming.currency());
    }

    private <T> T loadSetting(String key, Class<T> type, T defaultValue) {
        return settingsPort.load(key)
                .map(json -> parseOrDefault(json, type, defaultValue))
                .orElse(defaultValue);
    }

    private <T> void saveSetting(String key, T value) {
        try {
            String json = objectMapper.writeValueAsString(value);
            settingsPort.save(key, json);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize setting {}", key, e);
        }
    }

    private <T> T parseOrDefault(String json, Class<T> type, T defaultValue) {
        if (json == null || json.isBlank()) return defaultValue;
        try {
            return objectMapper.readValue(json, type);
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse setting, using default", e);
            return defaultValue;
        }
    }

    // Defaults
    private GeneralSettings defaultGeneral() {
        return new GeneralSettings("Maritime LMS", "He thong quan ly hoc tap hang hai", false, true, false);
    }

    private EmailSettings defaultEmail() {
        return new EmailSettings("smtp.gmail.com", 587, "", "", "noreply@maritime.edu", "Maritime LMS");
    }

    private PaymentSettings defaultPayment() {
        return new PaymentSettings("", "", "", "", "VND");
    }

    private SecuritySettings defaultSecurity() {
        return new SecuritySettings(1440, 5, 8, false);
    }

    // DTOs
    public record SettingsResponse(
            GeneralSettings general,
            EmailSettings email,
            PaymentSettings payment,
            SecuritySettings security
    ) {}

    public record GeneralSettings(
            String siteName,
            String siteDescription,
            boolean maintenanceMode,
            boolean allowRegistration,
            boolean requireEmailVerification
    ) {}

    public record EmailSettings(
            String smtpHost,
            int smtpPort,
            String smtpUser,
            String smtpPassword,
            String fromEmail,
            String fromName
    ) {}

    public record PaymentSettings(
            String stripePublicKey,
            String stripeSecretKey,
            String paypalClientId,
            String paypalClientSecret,
            String currency
    ) {}

    public record SecuritySettings(
            int sessionTimeout,
            int maxLoginAttempts,
            int passwordMinLength,
            boolean requireTwoFactor
    ) {}
}

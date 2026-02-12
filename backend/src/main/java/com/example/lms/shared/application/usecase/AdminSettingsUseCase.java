package com.example.lms.shared.application.usecase;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * Use case for system settings management.
 * Settings are stored as a simple key-value map.
 * For MVP: returns sensible defaults (no DB table needed yet).
 */
@Service
@RequiredArgsConstructor
public class AdminSettingsUseCase {

    @Transactional(readOnly = true)
    public SettingsResponse getSettings() {
        return new SettingsResponse(
                new GeneralSettings(
                        "Maritime LMS",
                        "He thong quan ly hoc tap hang hai",
                        false,
                        true,
                        false
                ),
                new EmailSettings(
                        "smtp.gmail.com",
                        587,
                        "",
                        "",
                        "noreply@maritime.edu",
                        "Maritime LMS"
                ),
                new PaymentSettings(
                        "",
                        "",
                        "",
                        "",
                        "VND"
                ),
                new SecuritySettings(
                        1440, // 24 hours in minutes
                        5,
                        8,
                        false
                )
        );
    }

    @Transactional
    public SettingsResponse updateSettings(SettingsResponse settings) {
        // For MVP: accept the settings and return them (in-memory)
        // In production: persist to a settings table or config store
        return settings;
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

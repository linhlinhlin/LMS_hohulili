package com.example.lms.shared.application.usecase;

import com.example.lms.shared.application.port.AdminSettingsPort;
import com.example.lms.shared.application.usecase.AdminSettingsUseCase.SettingsResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@DisplayName("AdminSettingsUseCase Tests")
@ExtendWith(MockitoExtension.class)
class AdminSettingsUseCaseTest {

    @Mock private AdminSettingsPort settingsPort;
    private AdminSettingsUseCase useCase;

    @BeforeEach
    void setUp() {
        useCase = new AdminSettingsUseCase(settingsPort, new ObjectMapper());
    }

    @Test
    @DisplayName("getSettings returns defaults when DB is empty")
    void getSettings_returnsDefaults() {
        when(settingsPort.loadAll()).thenReturn(Map.of());

        SettingsResponse response = useCase.getSettings();

        assertThat(response.general().siteName()).isEqualTo("Maritime LMS");
        assertThat(response.security().sessionTimeout()).isEqualTo(1440);
    }

    @Test
    @DisplayName("getSettings masks SMTP password")
    void getSettings_masksSmtpPassword() {
        when(settingsPort.loadAll()).thenReturn(Map.of(
                "email", "{\"smtpHost\":\"smtp.gmail.com\",\"smtpPort\":587,\"smtpUser\":\"\",\"smtpPassword\":\"real-secret\",\"fromEmail\":\"noreply@maritime.edu\",\"fromName\":\"Maritime LMS\"}"
        ));

        SettingsResponse response = useCase.getSettings();
        assertThat(response.email().smtpPassword()).isEqualTo("********");
    }

    @Test
    @DisplayName("getSettings masks payment secrets")
    void getSettings_masksPaymentSecrets() {
        when(settingsPort.loadAll()).thenReturn(Map.of(
                "payment", "{\"stripePublicKey\":\"\",\"stripeSecretKey\":\"sk_secret\",\"paypalClientId\":\"\",\"paypalClientSecret\":\"pp_secret\",\"currency\":\"VND\"}"
        ));

        SettingsResponse response = useCase.getSettings();
        assertThat(response.payment().stripeSecretKey()).isEqualTo("********");
        assertThat(response.payment().paypalClientSecret()).isEqualTo("********");
    }

    @Test
    @DisplayName("updateSettings preserves masked secrets")
    void updateSettings_preservesMaskedSecrets() {
        // Existing DB has real secrets
        when(settingsPort.load("email")).thenReturn(Optional.of(
                "{\"smtpHost\":\"smtp.gmail.com\",\"smtpPort\":587,\"smtpUser\":\"\",\"smtpPassword\":\"real-secret\",\"fromEmail\":\"noreply@maritime.edu\",\"fromName\":\"Maritime LMS\"}"
        ));
        when(settingsPort.load("payment")).thenReturn(Optional.of(
                "{\"stripePublicKey\":\"\",\"stripeSecretKey\":\"sk_live\",\"paypalClientId\":\"\",\"paypalClientSecret\":\"pp_live\",\"currency\":\"VND\"}"
        ));
        // For reload after save
        when(settingsPort.loadAll()).thenReturn(Map.of());

        // FE sends masked values back
        var input = new SettingsResponse(
                new AdminSettingsUseCase.GeneralSettings("Maritime LMS", "desc", false, true, false),
                new AdminSettingsUseCase.EmailSettings("smtp.gmail.com", 587, "", "********", "noreply@maritime.edu", "Maritime LMS"),
                new AdminSettingsUseCase.PaymentSettings("", "********", "", "********", "VND", false, true),
                new AdminSettingsUseCase.SecuritySettings(1440, 5, 8, false)
        );

        useCase.updateSettings(input);

        // Verify email was saved with preserved secret, not the masked value
        verify(settingsPort).save(eq("email"), argThat(json -> json.contains("real-secret")));
        verify(settingsPort).save(eq("payment"), argThat(json -> json.contains("sk_live") && json.contains("pp_live")));
    }
}

package com.example.lms.shared.application.usecase;

import com.example.lms.shared.application.usecase.AdminSettingsUseCase.SettingsResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("AdminSettingsUseCase Tests")
class AdminSettingsUseCaseTest {

    private final AdminSettingsUseCase useCase = new AdminSettingsUseCase();

    @Test
    @DisplayName("getSettings masks SMTP password")
    void getSettings_masksSmtpPassword() {
        SettingsResponse response = useCase.getSettings();

        assertThat(response.email().smtpPassword()).isEqualTo("********");
    }

    @Test
    @DisplayName("getSettings masks payment secrets")
    void getSettings_masksPaymentSecrets() {
        SettingsResponse response = useCase.getSettings();

        assertThat(response.payment().stripeSecretKey()).isEqualTo("********");
        assertThat(response.payment().paypalClientSecret()).isEqualTo("********");
    }
}

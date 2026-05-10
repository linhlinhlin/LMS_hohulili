package com.example.lms.ai_assistant.infrastructure.wiii;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class WiiiTokenExchangeAdapterTest {

    @Test
    void shouldPreferConfiguredSecret() {
        assertEquals(
                "configured-secret",
                WiiiTokenExchangeAdapter.resolveSigningSecret("configured-secret", "env-secret")
        );
    }

    @Test
    void shouldFallbackToEnvironmentSecretWhenConfigBindingIsBlank() {
        assertEquals(
                "env-secret",
                WiiiTokenExchangeAdapter.resolveSigningSecret("  ", "env-secret")
        );
    }

    @Test
    void shouldFailClosedWhenNoSecretIsAvailable() {
        assertEquals("", WiiiTokenExchangeAdapter.resolveSigningSecret(null, " "));
    }
}

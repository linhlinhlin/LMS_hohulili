package com.example.lms.shared.domain.valueobject;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit tests for Email value object.
 */
@DisplayName("Email Value Object Tests")
class EmailTest {

    @Nested
    @DisplayName("Valid Email Tests")
    class ValidEmailTests {

        @Test
        @DisplayName("Should create email with valid address")
        void shouldCreateEmailWithValidAddress() {
            Email email = Email.of("user@example.com");
            assertThat(email.getValue()).isEqualTo("user@example.com");
        }

        @Test
        @DisplayName("Should normalize to lowercase")
        void shouldNormalizeToLowercase() {
            Email email = Email.of("User@Example.COM");
            assertThat(email.getValue()).isEqualTo("user@example.com");
        }

        @Test
        @DisplayName("Should trim whitespace")
        void shouldTrimWhitespace() {
            Email email = Email.of("  user@example.com  ");
            assertThat(email.getValue()).isEqualTo("user@example.com");
        }

        @Test
        @DisplayName("Should accept email with dots and plus")
        void shouldAcceptEmailWithDotsAndPlus() {
            Email email = Email.of("first.last+tag@sub.domain.com");
            assertThat(email.getValue()).isEqualTo("first.last+tag@sub.domain.com");
        }
    }

    @Nested
    @DisplayName("Invalid Email Tests")
    class InvalidEmailTests {

        @Test
        @DisplayName("Should throw on null email")
        void shouldThrowOnNullEmail() {
            assertThatThrownBy(() -> Email.of(null))
                .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("Should throw on blank email")
        void shouldThrowOnBlankEmail() {
            assertThatThrownBy(() -> Email.of("   "))
                .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("Should throw on invalid format")
        void shouldThrowOnInvalidFormat() {
            assertThatThrownBy(() -> Email.of("notanemail"))
                .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("Should throw on missing @")
        void shouldThrowOnMissingAt() {
            assertThatThrownBy(() -> Email.of("user.example.com"))
                .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Nested
    @DisplayName("Domain/LocalPart Tests")
    class DomainLocalPartTests {

        @Test
        @DisplayName("Should extract domain")
        void shouldExtractDomain() {
            Email email = Email.of("admin@maritime.edu");
            assertThat(email.getDomain()).isEqualTo("maritime.edu");
        }

        @Test
        @DisplayName("Should extract local part")
        void shouldExtractLocalPart() {
            Email email = Email.of("admin@maritime.edu");
            assertThat(email.getLocalPart()).isEqualTo("admin");
        }
    }

    @Nested
    @DisplayName("Equality Tests")
    class EqualityTests {

        @Test
        @DisplayName("Should be equal for same email")
        void shouldBeEqualForSameEmail() {
            Email email1 = Email.of("test@example.com");
            Email email2 = Email.of("TEST@EXAMPLE.COM");
            assertThat(email1).isEqualTo(email2);
        }
    }
}

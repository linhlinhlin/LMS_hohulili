package com.example.lms.identity.domain.valueobject;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests for NIST SP 800-63B-4 compliant PasswordPolicy.
 *
 * Rules:
 * - Minimum 8 characters
 * - Maximum 128 characters
 * - No composition rules (no uppercase/lowercase/digit/symbol requirements)
 * - Block common/breached passwords
 */
@DisplayName("PasswordPolicy (NIST 800-63B-4)")
class PasswordPolicyTest {

    @Nested
    @DisplayName("Valid passwords")
    class ValidPasswords {

        @Test
        @DisplayName("Should accept 8-character password")
        void shouldAcceptMinLengthPassword() {
            assertThat(PasswordPolicy.validate("uniquepw")).isNull();
        }

        @Test
        @DisplayName("Should accept 128-character password")
        void shouldAcceptMaxLengthPassword() {
            String longPassword = "a".repeat(128);
            assertThat(PasswordPolicy.validate(longPassword)).isNull();
        }

        @Test
        @DisplayName("Should accept password without special characters (NIST: no composition rules)")
        void shouldAcceptNoSpecialChars() {
            assertThat(PasswordPolicy.validate("simplelowercasepassword")).isNull();
        }

        @Test
        @DisplayName("Should accept password with only digits (NIST: no composition rules)")
        void shouldAcceptOnlyDigits() {
            assertThat(PasswordPolicy.validate("12345678901")).isNull();
        }

        @Test
        @DisplayName("Should accept Unicode characters")
        void shouldAcceptUnicode() {
            assertThat(PasswordPolicy.validate("mậtkhẩuviệtnam")).isNull();
        }
    }

    @Nested
    @DisplayName("Invalid passwords - too short")
    class TooShort {

        @Test
        @DisplayName("Should reject null password")
        void shouldRejectNull() {
            String error = PasswordPolicy.validate(null);
            assertThat(error).contains("ít nhất 8 ký tự");
        }

        @Test
        @DisplayName("Should reject empty password")
        void shouldRejectEmpty() {
            String error = PasswordPolicy.validate("");
            assertThat(error).contains("ít nhất 8 ký tự");
        }

        @Test
        @DisplayName("Should reject 7-character password")
        void shouldRejectSevenChars() {
            String error = PasswordPolicy.validate("abcdefg");
            assertThat(error).contains("ít nhất 8 ký tự");
        }
    }

    @Nested
    @DisplayName("Invalid passwords - too long")
    class TooLong {

        @Test
        @DisplayName("Should reject 129-character password")
        void shouldReject129Chars() {
            String longPassword = "a".repeat(129);
            String error = PasswordPolicy.validate(longPassword);
            assertThat(error).contains("không được quá 128 ký tự");
        }
    }

    @Nested
    @DisplayName("Invalid passwords - common/breached")
    class CommonPasswords {

        @ParameterizedTest
        @ValueSource(strings = {
                "password", "12345678", "qwerty123", "admin123",
                "letmein1", "iloveyou", "password1", "abc12345"
        })
        @DisplayName("Should reject common passwords")
        void shouldRejectCommonPasswords(String commonPassword) {
            String error = PasswordPolicy.validate(commonPassword);
            assertThat(error).contains("quá phổ biến");
        }

        @Test
        @DisplayName("Should reject common passwords case-insensitively")
        void shouldRejectCaseInsensitive() {
            String error = PasswordPolicy.validate("PASSWORD");
            assertThat(error).contains("quá phổ biến");
        }
    }
}

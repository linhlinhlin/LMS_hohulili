package com.example.lms.identity.domain.valueobject;

import java.util.Set;

/**
 * NIST SP 800-63B-4 compliant password policy.
 *
 * Rules:
 * - Minimum 8 characters (MFA-ready)
 * - Maximum 128 characters (BCrypt DoS prevention)
 * - NO composition rules (no forced uppercase/lowercase/special chars)
 * - Block common/breached passwords
 */
public final class PasswordPolicy {

    public static final int MIN_LENGTH = 8;
    public static final int MAX_LENGTH = 128;

    /**
     * Top 50 most common passwords (NIST recommends checking against breached lists).
     * For a production system, use HaveIBeenPwned API or a larger blocklist file.
     */
    private static final Set<String> COMMON_PASSWORDS = Set.of(
            "password", "12345678", "123456789", "1234567890", "qwerty123",
            "password1", "iloveyou", "sunshine1", "princess1", "football1",
            "charlie1", "access14", "master12", "monkey123", "shadow12",
            "dragon12", "michael1", "mustang1", "jennifer", "trustno1",
            "letmein1", "baseball", "superman", "harley12", "whatever",
            "jordan23", "testtest", "abcdefgh", "abcd1234", "admin123",
            "passw0rd", "p@ssw0rd", "welcome1", "qwerty12", "abc12345",
            "11111111", "22222222", "12341234", "password123", "teacher123",
            "student123", "maritime", "changeme", "Pa55word", "default1",
            "login123", "hello123", "asdfghjk", "zxcvbnm1", "qwertyui"
    );

    private PasswordPolicy() {}

    /**
     * Validate password against NIST 800-63B-4 policy.
     *
     * @param password raw password to validate
     * @return null if valid, error message (Vietnamese) if invalid
     */
    public static String validate(String password) {
        if (password == null || password.length() < MIN_LENGTH) {
            return "Mật khẩu phải có ít nhất " + MIN_LENGTH + " ký tự";
        }
        if (password.length() > MAX_LENGTH) {
            return "Mật khẩu không được quá " + MAX_LENGTH + " ký tự";
        }
        if (COMMON_PASSWORDS.contains(password.toLowerCase())) {
            return "Mật khẩu quá phổ biến, vui lòng chọn mật khẩu khác";
        }
        return null; // Valid
    }

    /**
     * Check if password meets minimum requirements (for @Size annotations).
     */
    public static boolean isValid(String password) {
        return validate(password) == null;
    }
}

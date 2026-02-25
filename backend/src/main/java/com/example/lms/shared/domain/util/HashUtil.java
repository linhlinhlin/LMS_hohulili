package com.example.lms.shared.domain.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * Shared SHA-256 hashing utility.
 * Extracted from RequestPasswordResetUseCase, SendVerificationEmailUseCase, VerifyEmailUseCase.
 */
public final class HashUtil {

    private HashUtil() {}

    /**
     * Compute SHA-256 hash of the given input string.
     *
     * @param input the string to hash
     * @return hex-encoded SHA-256 hash
     */
    public static String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}

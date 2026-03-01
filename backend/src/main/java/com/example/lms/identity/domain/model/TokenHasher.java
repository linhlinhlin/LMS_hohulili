package com.example.lms.identity.domain.model;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Domain utility for generating and hashing invite tokens.
 * Raw token is sent via email; SHA-256 hash is stored in DB.
 * This prevents token theft from a DB breach.
 */
public final class TokenHasher {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int TOKEN_BYTES = 32; // 256 bits entropy

    private TokenHasher() {}

    /**
     * Generate a cryptographically random token (Base64URL, no padding).
     * This raw token is sent in the email link.
     */
    public static String generateRawToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /**
     * Hash a raw token using SHA-256 for storage.
     * The hash is stored in the database; the raw token is never persisted.
     */
    public static String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hashBytes);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    /**
     * Verify a raw token against a stored hash.
     */
    public static boolean verify(String rawToken, String storedHash) {
        return hash(rawToken).equals(storedHash);
    }
}

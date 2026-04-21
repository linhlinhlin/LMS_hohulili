package com.example.lms.identity.infrastructure.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Short-lived in-memory store for OAuth state + PKCE verifier + per-flow context.
 *
 * <p>Each entry is created in {@code /authorize} and consumed exactly once in {@code /callback}.
 * Entries expire after {@link #TTL} to prevent unbounded memory growth from abandoned flows
 * (user closes the Google tab, network failure, etc.). A scheduled sweep clears expired entries.
 *
 * <p>Single-node only — adequate for our current deployment topology. If we ever scale out,
 * swap this for Redis or a dedicated cache (entries are tiny, ~200 bytes, TTL is 10 minutes,
 * so a stateless callback also works if the callback always lands on the same node behind
 * a sticky LB).
 */
@Component
@Slf4j
public class GoogleOAuthStateStore {

    private static final Duration TTL = Duration.ofMinutes(10);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Base64.Encoder URL_ENCODER = Base64.getUrlEncoder().withoutPadding();

    private final ConcurrentMap<String, Entry> store = new ConcurrentHashMap<>();

    /** Generate + store a fresh state. Returns the state token + PKCE challenge to pass to Google. */
    public Issued issue(String inviteCode, String returnUrl) {
        String state = randomToken(32);
        String codeVerifier = randomToken(48);     // 64 chars after b64url encoding — fits PKCE 43-128 spec
        String codeChallenge = pkceChallenge(codeVerifier);

        Entry entry = new Entry(codeVerifier, normalize(inviteCode), normalize(returnUrl), Instant.now().plus(TTL));
        store.put(state, entry);

        return new Issued(state, codeChallenge, codeVerifier);
    }

    /**
     * Look up + atomically remove a state (single use). Returns empty if state is unknown
     * or already expired. Callers should treat empty as "CSRF / replay attempt".
     */
    public Optional<Entry> consume(String state) {
        if (state == null || state.isBlank()) {
            return Optional.empty();
        }
        Entry entry = store.remove(state);
        if (entry == null) {
            return Optional.empty();
        }
        if (Instant.now().isAfter(entry.expiresAt())) {
            log.warn("OAuth state expired before callback (entry age > {} minutes)", TTL.toMinutes());
            return Optional.empty();
        }
        return Optional.of(entry);
    }

    /** Hourly sweep — TTL is 10 min so this is generous. Cheap operation, ConcurrentMap iteration is safe. */
    @Scheduled(fixedDelay = 60 * 60 * 1000L, initialDelay = 60 * 60 * 1000L)
    void sweepExpired() {
        Instant now = Instant.now();
        int removed = 0;
        for (var iterator = store.entrySet().iterator(); iterator.hasNext(); ) {
            var entry = iterator.next();
            if (now.isAfter(entry.getValue().expiresAt())) {
                iterator.remove();
                removed++;
            }
        }
        if (removed > 0) {
            log.debug("Swept {} expired OAuth state entries", removed);
        }
    }

    private static String randomToken(int byteLength) {
        byte[] bytes = new byte[byteLength];
        RANDOM.nextBytes(bytes);
        return URL_ENCODER.encodeToString(bytes);
    }

    private static String pkceChallenge(String codeVerifier) {
        try {
            var digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(codeVerifier.getBytes(java.nio.charset.StandardCharsets.US_ASCII));
            return URL_ENCODER.encodeToString(hash);
        } catch (java.security.NoSuchAlgorithmException e) {
            // Every JRE ships SHA-256 — this branch is theoretically unreachable.
            throw new IllegalStateException("SHA-256 unavailable on this JVM", e);
        }
    }

    private static String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    public record Entry(String codeVerifier, String inviteCode, String returnUrl, Instant expiresAt) {}
    public record Issued(String state, String codeChallenge, String codeVerifier) {}
}

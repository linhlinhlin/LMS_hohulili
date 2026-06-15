package com.example.lms.learning_delivery.infrastructure.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

@Service
public class VideoPlaybackTokenService {

    @Value("${app.jwt.secret}")
    private String secretKey;

    @Value("${app.video.playback-token-expiry-seconds:14400}")
    private long tokenExpirySeconds;

    @Value("${app.video.edge-auth-mode:disabled}")
    private String edgeAuthMode;

    @Value("${app.video.edge-hmac-secret:}")
    private String edgeHmacSecret;

    @Value("${app.video.edge-token-expiry-seconds:300}")
    private long edgeTokenExpirySeconds;

    public String mintToken(UUID assetId, UUID userId, String format) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .claims(Map.of(
                        "type", "video-playback",
                        "assetId", assetId.toString(),
                        "userId", userId.toString(),
                        "format", normalizeFormat(format)
                ))
                .subject(userId.toString())
                .issuedAt(new Date(now))
                .expiration(new Date(now + (tokenExpirySeconds * 1000)))
                .signWith(getSignInKey())
                .compact();
    }

    public PlaybackClaims parseAndValidate(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSignInKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        if (!"video-playback".equals(claims.get("type", String.class))) {
            throw new IllegalArgumentException("Invalid playback token type");
        }

        return new PlaybackClaims(
                UUID.fromString(claims.get("assetId", String.class)),
                UUID.fromString(claims.get("userId", String.class)),
                normalizeFormat(claims.get("format", String.class))
        );
    }

    public String normalizeFormat(String format) {
        return "dash".equalsIgnoreCase(format) ? "dash" : "hls";
    }

    public boolean isMediaDomainEdgeAuthEnabled() {
        return VideoPlaybackDeliveryPolicy.isMediaDomainEdgeAuthEnabled(
                edgeAuthMode,
                edgeHmacSecret,
                edgeTokenExpirySeconds
        );
    }

    public String normalizeEdgeAuthMode(String mode) {
        return VideoPlaybackDeliveryPolicy.normalizeEdgeAuthMode(mode);
    }

    public String mintEdgeObjectToken(String requestPath) {
        return mintEdgeObjectToken(requestPath, Instant.now().getEpochSecond());
    }

    String mintEdgeObjectToken(String requestPath, long issuedAtEpochSeconds) {
        if (!isMediaDomainEdgeAuthEnabled()) {
            throw new IllegalStateException("Media-domain edge auth is not enabled");
        }
        if (requestPath == null || requestPath.isBlank()) {
            throw new IllegalArgumentException("Request path is required");
        }

        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(edgeHmacSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal((requestPath + issuedAtEpochSeconds).getBytes(StandardCharsets.UTF_8));
            return issuedAtEpochSeconds + "-" + Base64.getEncoder().encodeToString(digest);
        } catch (NoSuchAlgorithmException | InvalidKeyException exception) {
            throw new IllegalStateException("Unable to mint edge auth token", exception);
        }
    }

    private SecretKey getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public record PlaybackClaims(UUID assetId, UUID userId, String format) {}
}

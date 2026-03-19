package com.example.lms.learning_delivery.infrastructure.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

@Service
public class VideoPlaybackTokenService {

    @Value("${app.jwt.secret}")
    private String secretKey;

    @Value("${app.video.playback-token-expiry-seconds:14400}")
    private long tokenExpirySeconds;

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

    private SecretKey getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public record PlaybackClaims(UUID assetId, UUID userId, String format) {}
}

package com.example.lms.identity.infrastructure.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("TokenServiceAdapter Tests")
class TokenServiceAdapterTest {

    private static final String PRIMARY_SECRET = Base64.getEncoder()
            .encodeToString("12345678901234567890123456789012".getBytes(StandardCharsets.UTF_8));
    private static final String SECONDARY_SECRET = Base64.getEncoder()
            .encodeToString("abcdefghijklmnopqrstuvwxyz123456".getBytes(StandardCharsets.UTF_8));

    @Test
    @DisplayName("extractEmail returns null for malformed JWT")
    void extractEmailReturnsNullForMalformedJwt() {
        TokenServiceAdapter adapter = new TokenServiceAdapter(jwtService(PRIMARY_SECRET));

        assertThat(adapter.extractEmail("not-a-jwt")).isNull();
    }

    @Test
    @DisplayName("isTokenValid returns false for JWT signed with a different secret")
    void isTokenValidReturnsFalseForJwtSignedWithDifferentSecret() {
        TokenServiceAdapter adapter = new TokenServiceAdapter(jwtService(PRIMARY_SECRET));
        UserDetails userDetails = User.withUsername("student@maritime.edu")
                .password("")
                .authorities("ROLE_USER")
                .build();
        String signedByOtherSecret = jwtService(SECONDARY_SECRET).generateRefreshToken(userDetails);

        assertThat(adapter.extractEmail(signedByOtherSecret)).isNull();
        assertThat(adapter.isTokenValid(signedByOtherSecret, userDetails.getUsername())).isFalse();
    }

    @Test
    @DisplayName("generated access and refresh tokens carry distinct token types")
    void generatedTokensCarryDistinctTokenTypes() {
        JwtService jwtService = jwtService(PRIMARY_SECRET);
        UserDetails userDetails = User.withUsername("student@maritime.edu")
                .password("")
                .authorities("ROLE_USER")
                .build();

        String accessToken = jwtService.generateToken(userDetails);
        String refreshToken = jwtService.generateRefreshToken(userDetails);

        String accessType = jwtService.extractClaim(accessToken, claims -> claims.get("typ", String.class));
        String refreshType = jwtService.extractClaim(refreshToken, claims -> claims.get("typ", String.class));

        assertThat(accessType).isEqualTo("access");
        assertThat(refreshType).isEqualTo("refresh");
    }

    @Test
    @DisplayName("isRefreshToken accepts only tokens generated for refresh use")
    void isRefreshTokenAcceptsOnlyRefreshTokens() {
        TokenServiceAdapter adapter = new TokenServiceAdapter(jwtService(PRIMARY_SECRET));
        UserDetails userDetails = User.withUsername("student@maritime.edu")
                .password("")
                .authorities("ROLE_USER")
                .build();
        JwtService jwtService = jwtService(PRIMARY_SECRET);
        String accessToken = jwtService.generateToken(userDetails);
        String refreshToken = jwtService.generateRefreshToken(userDetails);

        assertThat(adapter.isRefreshToken(accessToken)).isFalse();
        assertThat(adapter.isRefreshToken(refreshToken)).isTrue();
    }

    @Test
    @DisplayName("tokens issued before token typing are neither access nor refresh tokens")
    void legacyUntypedTokensAreRejectedByBothTokenTypeChecks() {
        JwtService jwtService = jwtService(PRIMARY_SECRET);
        String legacyToken = Jwts.builder()
                .subject("student@maritime.edu")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 3_600_000L))
                .signWith(Keys.hmacShaKeyFor(Decoders.BASE64.decode(PRIMARY_SECRET)))
                .compact();

        assertThat(jwtService.isAccessToken(legacyToken)).isFalse();
        assertThat(jwtService.isRefreshToken(legacyToken)).isFalse();
    }

    private static JwtService jwtService(String secret) {
        JwtService jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secretKey", secret);
        ReflectionTestUtils.setField(jwtService, "jwtExpiration", 3_600_000L);
        ReflectionTestUtils.setField(jwtService, "refreshExpiration", 86_400_000L);
        return jwtService;
    }
}

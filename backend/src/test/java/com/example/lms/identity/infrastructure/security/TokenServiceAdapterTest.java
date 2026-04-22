package com.example.lms.identity.infrastructure.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

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

    private static JwtService jwtService(String secret) {
        JwtService jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secretKey", secret);
        ReflectionTestUtils.setField(jwtService, "jwtExpiration", 3_600_000L);
        ReflectionTestUtils.setField(jwtService, "refreshExpiration", 86_400_000L);
        return jwtService;
    }
}

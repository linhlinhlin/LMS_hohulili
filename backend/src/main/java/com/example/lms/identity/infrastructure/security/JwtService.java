package com.example.lms.identity.infrastructure.security;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

/**
 * JWT Service for token generation and validation.
 * Migrated from legacy service package to identity.infrastructure.security.
 */
@Service
public class JwtService {

    private static final String TOKEN_TYPE_CLAIM = "typ";
    private static final String ACCESS_TOKEN_TYPE = "access";
    private static final String REFRESH_TOKEN_TYPE = "refresh";

    @Value("${app.jwt.secret}")
    private String secretKey;

    @Value("${app.jwt.expiration}")
    private long jwtExpiration;

    @Value("${app.jwt.refresh-expiration}")
    private long refreshExpiration;

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public String generateToken(UserDetails userDetails) {
        return generateToken(new HashMap<>(), userDetails);
    }

    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>(extraClaims);
        claims.put(TOKEN_TYPE_CLAIM, ACCESS_TOKEN_TYPE);
        return buildToken(claims, userDetails, jwtExpiration);
    }

    public String generateRefreshToken(UserDetails userDetails) {
        return buildToken(refreshClaims(), userDetails, refreshExpiration);
    }

    public String generateRefreshToken(UserDetails userDetails, long expirationMs) {
        return buildToken(refreshClaims(), userDetails, expirationMs);
    }

    private String buildToken(Map<String, Object> extraClaims, UserDetails userDetails, long expiration) {
        String subject = userDetails.getUsername(); // Default to username
        
        if (userDetails instanceof UserJpaEntity) {
            UserJpaEntity user = (UserJpaEntity) userDetails;
            extraClaims.put("userId", user.getId().toString());
            extraClaims.put("role", user.getRole().name());
            // Use email as subject for consistent lookup
            subject = user.getEmail();
        }
        return Jwts.builder()
                .claims(extraClaims)
                .subject(subject)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSignInKey())
                .compact();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername())) && !isTokenExpired(token);
    }

    public boolean isAccessToken(String token) {
        return ACCESS_TOKEN_TYPE.equals(
                extractClaim(token, claims -> claims.get(TOKEN_TYPE_CLAIM, String.class))
        );
    }

    public boolean isRefreshToken(String token) {
        return REFRESH_TOKEN_TYPE.equals(
                extractClaim(token, claims -> claims.get(TOKEN_TYPE_CLAIM, String.class))
        );
    }

    private Map<String, Object> refreshClaims() {
        Map<String, Object> claims = new HashMap<>();
        claims.put(TOKEN_TYPE_CLAIM, REFRESH_TOKEN_TYPE);
        return claims;
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSignInKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}

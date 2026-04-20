package com.example.lms.identity.infrastructure.security;

import com.example.lms.identity.application.dto.VerifiedGoogleIdentity;
import com.example.lms.identity.application.port.GoogleIdentityVerifierPort;
import com.example.lms.shared.exception.DomainException;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;
import java.util.Set;

@Component
@Slf4j
public class GoogleIdentityVerifierAdapter implements GoogleIdentityVerifierPort {

    private static final Set<String> ALLOWED_ISSUERS = Set.of("accounts.google.com", "https://accounts.google.com");

    private final GoogleIdTokenVerifier verifier;
    private final boolean enabled;
    private final String webClientId;

    public GoogleIdentityVerifierAdapter(
            @Value("${app.auth.google.enabled:false}") boolean enabled,
            @Value("${app.auth.google.web-client-id:}") String webClientId
    ) {
        this.enabled = enabled;
        this.webClientId = webClientId != null ? webClientId.trim() : "";
        this.verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), JacksonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList(this.webClientId))
                .build();
    }

    @Override
    public VerifiedGoogleIdentity verifyIdToken(String idToken) {
        if (!enabled || webClientId.isBlank()) {
            throw new DomainException("GOOGLE_AUTH_DISABLED", "Dang nhap Google chua duoc bat");
        }
        if (idToken == null || idToken.isBlank()) {
            throw new DomainException("GOOGLE_TOKEN_INVALID", "Google credential khong hop le");
        }

        GoogleIdToken googleIdToken;
        try {
            googleIdToken = verifier.verify(idToken);
        } catch (GeneralSecurityException | IOException e) {
            log.warn("Google token verification failed", e);
            throw new DomainException("GOOGLE_TOKEN_INVALID", "Google credential khong hop le", e);
        }

        if (googleIdToken == null) {
            throw new DomainException("GOOGLE_TOKEN_INVALID", "Google credential khong hop le");
        }

        GoogleIdToken.Payload payload = googleIdToken.getPayload();
        if (!ALLOWED_ISSUERS.contains(payload.getIssuer())) {
            throw new DomainException("GOOGLE_TOKEN_INVALID", "Nguon Google credential khong hop le");
        }

        String email = payload.getEmail();
        if (email == null || email.isBlank()) {
            throw new DomainException("GOOGLE_TOKEN_INVALID", "Tai khoan Google khong cung cap email hop le");
        }

        if (!Boolean.TRUE.equals(payload.getEmailVerified())) {
            throw new DomainException("GOOGLE_ACCOUNT_EMAIL_UNVERIFIED", "Tai khoan Google nay chua xac minh email");
        }

        return new VerifiedGoogleIdentity(
                payload.getSubject(),
                email,
                true,
                (String) payload.get("name"),
                (String) payload.get("picture")
        );
    }
}

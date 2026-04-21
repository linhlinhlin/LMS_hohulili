package com.example.lms.identity.infrastructure.security;

import com.example.lms.shared.exception.DomainException;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/**
 * Exchanges an OAuth authorization {@code code} for tokens (id_token + access_token + refresh_token)
 * via Google's {@code https://oauth2.googleapis.com/token} endpoint.
 *
 * <p>This is the second leg of the redirect flow. The first leg redirected the user to
 * {@code accounts.google.com/o/oauth2/v2/auth} with a {@code code_challenge}; here we POST
 * the matching {@code code_verifier} alongside the code Google returned.
 *
 * <p>We use {@link RestClient} (Spring 6.1+) because it ships with Spring Boot and gives us
 * blocking HTTP without pulling in WebFlux.
 */
@Component
@Slf4j
public class GoogleOAuthTokenClient {

    private static final String DEFAULT_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

    private final RestClient restClient;
    private final String webClientId;

    public GoogleOAuthTokenClient(
            @Value("${app.auth.google.web-client-id:}") String webClientId,
            @Value("${app.auth.google.token-endpoint:" + DEFAULT_TOKEN_ENDPOINT + "}") String tokenEndpoint
    ) {
        this.webClientId = webClientId == null ? "" : webClientId.trim();
        this.restClient = RestClient.builder()
                .baseUrl(tokenEndpoint)
                .defaultHeader("Accept", MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    /**
     * @return parsed Google token response — caller is interested mainly in {@code idToken()}
     * @throws DomainException if Google rejects the exchange (bad code, expired, redirect_uri mismatch, etc.)
     */
    public GoogleTokenResponse exchange(String code, String codeVerifier, String clientSecret, String redirectUri) {
        if (webClientId.isBlank()) {
            throw new DomainException("GOOGLE_AUTH_DISABLED", "Dang nhap Google chua duoc bat");
        }

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("code", code);
        form.add("client_id", webClientId);
        form.add("client_secret", clientSecret);
        form.add("redirect_uri", redirectUri);
        form.add("grant_type", "authorization_code");
        form.add("code_verifier", codeVerifier);

        try {
            GoogleTokenResponse response = restClient.post()
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(GoogleTokenResponse.class);

            if (response == null || response.idToken() == null || response.idToken().isBlank()) {
                throw new DomainException("GOOGLE_TOKEN_INVALID", "Google khong tra ve id_token");
            }
            return response;
        } catch (RestClientResponseException e) {
            // Google returns JSON like {"error":"invalid_grant","error_description":"Bad Request"} on failure.
            // We log the full body for ops triage but return a generic message to the caller.
            log.warn("Google token exchange failed: {} {} body={}",
                    e.getStatusCode(), e.getStatusText(), e.getResponseBodyAsString());
            throw new DomainException("GOOGLE_TOKEN_EXCHANGE_FAILED",
                    "Khong the trao doi ma Google. Vui long thu lai.", e);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record GoogleTokenResponse(
            @JsonProperty("access_token") String accessToken,
            @JsonProperty("expires_in") Integer expiresIn,
            @JsonProperty("refresh_token") String refreshToken,
            @JsonProperty("scope") String scope,
            @JsonProperty("token_type") String tokenType,
            @JsonProperty("id_token") String idToken
    ) {}
}

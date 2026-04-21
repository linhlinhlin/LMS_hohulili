package com.example.lms.identity.infrastructure.security;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Server-side Google OAuth (authorization code flow) configuration.
 *
 * <p>This is separate from the existing ID-token flow ({@code POST /api/v3/auth/google}).
 * The ID-token flow runs entirely in the browser via Google Identity Services and posts
 * the resulting JWT to the backend. The redirect flow takes the user away from the SPA
 * to {@code accounts.google.com}, then back through {@code /api/v3/auth/google/callback},
 * and is much more reliable in restricted networks where FedCM / popups fail.
 *
 * <p>Properties bind to {@code app.auth.google.*} in {@code application.yml}.
 */
@Configuration
@ConfigurationProperties(prefix = "app.auth.google")
public class GoogleOAuthProperties {

    /** Master switch for the redirect flow endpoints. */
    private boolean redirectFlowEnabled = false;

    /** OAuth 2.0 client secret from Google Cloud Console. */
    private String clientSecret = "";

    /** Authorized redirect URI registered in Google Cloud Console — must match exactly. */
    private String redirectUri = "";

    /** Where the backend forwards the user after a successful callback. JWT goes in the URL fragment. */
    private String frontendCallbackUri = "";

    public boolean isRedirectFlowEnabled() { return redirectFlowEnabled; }
    public void setRedirectFlowEnabled(boolean redirectFlowEnabled) { this.redirectFlowEnabled = redirectFlowEnabled; }

    public String getClientSecret() { return clientSecret; }
    public void setClientSecret(String clientSecret) { this.clientSecret = clientSecret == null ? "" : clientSecret.trim(); }

    public String getRedirectUri() { return redirectUri; }
    public void setRedirectUri(String redirectUri) { this.redirectUri = redirectUri == null ? "" : redirectUri.trim(); }

    public String getFrontendCallbackUri() { return frontendCallbackUri; }
    public void setFrontendCallbackUri(String frontendCallbackUri) {
        this.frontendCallbackUri = frontendCallbackUri == null ? "" : frontendCallbackUri.trim();
    }

    /** True only when every field needed for a working redirect flow is present. */
    public boolean isFullyConfigured() {
        return redirectFlowEnabled
                && !clientSecret.isBlank()
                && !redirectUri.isBlank()
                && !frontendCallbackUri.isBlank();
    }
}

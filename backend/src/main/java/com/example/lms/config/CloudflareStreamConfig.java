package com.example.lms.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Cloudflare Stream configuration.
 * Properties loaded from application-*.yml under cloudflare.stream.
 *
 * Required env vars (set in .env / .env.prod):
 *   CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_API_TOKEN,
 *   CLOUDFLARE_STREAM_KEY_ID, CLOUDFLARE_STREAM_PRIVATE_KEY
 */
@Configuration
@ConfigurationProperties(prefix = "cloudflare.stream")
public class CloudflareStreamConfig {

    private String accountId;
    private String apiToken;
    private boolean enabled = false;
    /** Signing key ID for JWT playback tokens */
    private String keyId;
    /** RSA private key (PEM, base64-encoded) for JWT signing */
    private String privateKey;
    /** Playback token lifetime in seconds (default 4 hours) */
    private int tokenExpirySeconds = 14_400;

    public String getAccountId() { return accountId; }
    public void setAccountId(String accountId) { this.accountId = accountId; }

    public String getApiToken() { return apiToken; }
    public void setApiToken(String apiToken) { this.apiToken = apiToken; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public String getKeyId() { return keyId; }
    public void setKeyId(String keyId) { this.keyId = keyId; }

    public String getPrivateKey() { return privateKey; }
    public void setPrivateKey(String privateKey) { this.privateKey = privateKey; }

    public int getTokenExpirySeconds() { return tokenExpirySeconds; }
    public void setTokenExpirySeconds(int tokenExpirySeconds) { this.tokenExpirySeconds = tokenExpirySeconds; }
}

package com.example.lms.shared.integration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration properties for Wiii AI integration.
 *
 * <p>Binds all {@code wiii.*} properties from application.yml:
 * webhook emitter, token exchange, and service-to-service auth.
 *
 * <pre>
 * wiii:
 *   webhook:
 *     url: http://localhost:8000/api/v1/lms/webhook/maritime-lms
 *     secret: shared-secret-here
 *     enabled: false
 *     timeout: 10
 *     retry-max: 2
 *   token-exchange:
 *     url: http://localhost:8000/api/v1/auth/lms/token
 *   service-token: wiii-service-token
 * </pre>
 */
@Configuration
@ConfigurationProperties(prefix = "wiii")
public class WiiiIntegrationConfig {

    private Webhook webhook = new Webhook();
    private TokenExchange tokenExchange = new TokenExchange();
    private String serviceToken;

    public Webhook getWebhook() {
        return webhook;
    }

    public void setWebhook(Webhook webhook) {
        this.webhook = webhook;
    }

    public TokenExchange getTokenExchange() {
        return tokenExchange;
    }

    public void setTokenExchange(TokenExchange tokenExchange) {
        this.tokenExchange = tokenExchange;
    }

    public String getServiceToken() {
        return serviceToken;
    }

    public void setServiceToken(String serviceToken) {
        this.serviceToken = serviceToken;
    }

    public static class Webhook {
        private String url = "http://localhost:8000/api/v1/lms/webhook/maritime-lms";
        private String secret = "";
        private boolean enabled = false;
        private int timeout = 10;
        private int retryMax = 2;

        public String getUrl() { return url; }
        public void setUrl(String url) { this.url = url; }
        public String getSecret() { return secret; }
        public void setSecret(String secret) { this.secret = secret; }
        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
        public int getTimeout() { return timeout; }
        public void setTimeout(int timeout) { this.timeout = timeout; }
        public int getRetryMax() { return retryMax; }
        public void setRetryMax(int retryMax) { this.retryMax = retryMax; }
    }

    public static class TokenExchange {
        private String url = "http://localhost:8000/api/v1/auth/lms/token";

        public String getUrl() { return url; }
        public void setUrl(String url) { this.url = url; }
    }
}

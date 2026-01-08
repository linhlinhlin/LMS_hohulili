package com.example.lms.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration properties cho AI Service.
 * Đọc từ application.yml với prefix "ai.service"
 */
@Configuration
@ConfigurationProperties(prefix = "ai.service")
public class AIServiceConfig {
    
    private String url;
    private String apiKey;
    private int timeout = 90;
    private RetryConfig retry = new RetryConfig();
    
    public String getUrl() {
        return url;
    }
    
    public void setUrl(String url) {
        this.url = url;
    }
    
    public String getApiKey() {
        return apiKey;
    }
    
    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }
    
    public int getTimeout() {
        return timeout;
    }
    
    public void setTimeout(int timeout) {
        this.timeout = timeout;
    }
    
    public RetryConfig getRetry() {
        return retry;
    }
    
    public void setRetry(RetryConfig retry) {
        this.retry = retry;
    }
    
    public static class RetryConfig {
        private int maxAttempts = 2;
        private int delay = 1000;
        
        public int getMaxAttempts() {
            return maxAttempts;
        }
        
        public void setMaxAttempts(int maxAttempts) {
            this.maxAttempts = maxAttempts;
        }
        
        public int getDelay() {
            return delay;
        }
        
        public void setDelay(int delay) {
            this.delay = delay;
        }
    }
}

package com.example.lms.dto.ai.external;

/**
 * Health check response từ AI Service.
 * Format: {"status": "ok", "database": "connected|disconnected"}
 */
public record AIHealthResponse(
    String status,
    String database
) {
    /**
     * Check if AI Service is healthy
     * Status "ok" means service is running
     */
    public boolean isHealthy() {
        return "ok".equals(status);
    }
    
    /**
     * Get version info (not provided by AI Service, return status instead)
     */
    public String version() {
        return status;
    }
}

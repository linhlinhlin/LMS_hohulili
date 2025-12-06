package com.example.lms.dto.ai;

/**
 * DTO cho health check response.
 * Trả về trạng thái của LMS Backend và AI Service.
 */
public record HealthStatusDTO(
    String status,
    String aiServiceStatus,
    String version,
    String error
) {
    public static HealthStatusDTO healthy(String version) {
        return new HealthStatusDTO("healthy", "healthy", version, null);
    }
    
    public static HealthStatusDTO degraded(String error) {
        return new HealthStatusDTO("degraded", "unhealthy", null, error);
    }
}

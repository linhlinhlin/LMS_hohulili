package com.example.lms.dto.ai.external;

/**
 * Response từ AI Backend khi check job status
 * Maps to: GET /api/v1/knowledge/jobs/{job_id}
 */
public record KnowledgeJobStatusResponse(
    String job_id,
    String status,          // "processing", "completed", "failed"
    Integer progress,       // 0-100
    Integer nodes_created,  // Số nodes đã tạo trong Neo4j
    String error_message,   // Error message nếu failed
    String filename,
    String category
) {
    public boolean isCompleted() {
        return "completed".equals(status);
    }
    
    public boolean isFailed() {
        return "failed".equals(status);
    }
    
    public boolean isProcessing() {
        return "processing".equals(status);
    }
}

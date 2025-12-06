package com.example.lms.dto.ai;

/**
 * DTO cho Frontend hiển thị trạng thái job
 */
public record KnowledgeJobStatusDTO(
    String jobId,
    String status,          // "processing", "completed", "failed"
    Integer progress,       // 0-100
    Integer nodesCreated,
    String errorMessage,
    String filename,
    String category
) {
    public boolean isCompleted() {
        return "completed".equals(status);
    }
    
    public boolean isFailed() {
        return "failed".equals(status);
    }
}

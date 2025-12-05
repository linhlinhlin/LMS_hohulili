package com.example.lms.dto.ai.external;

/**
 * Response từ AI Backend khi upload document
 * Maps to: POST /api/v1/knowledge/ingest
 */
public record KnowledgeIngestResponse(
    String status,      // "accepted", "error"
    String job_id,      // UUID để tracking
    String message      // Human readable message
) {
    public boolean isAccepted() {
        return "accepted".equals(status);
    }
}

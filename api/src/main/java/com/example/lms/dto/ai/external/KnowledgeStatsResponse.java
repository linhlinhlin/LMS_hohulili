package com.example.lms.dto.ai.external;

import java.util.Map;
import java.util.List;

/**
 * Response từ AI Backend khi lấy thống kê Knowledge Base
 * Maps to: GET /api/v1/knowledge/stats
 */
public record KnowledgeStatsResponse(
    Integer total_documents,
    Integer total_nodes,
    Map<String, Integer> categories,    // {"COLREGs": 120, "SOLAS": 80}
    List<RecentUpload> recent_uploads
) {
    public record RecentUpload(
        String id,
        String filename,
        String category,
        String uploaded_at
    ) {}
}

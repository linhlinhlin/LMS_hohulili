package com.example.lms.dto.ai;

import java.util.Map;
import java.util.List;

/**
 * DTO cho Frontend hiển thị thống kê Knowledge Base
 */
public record KnowledgeStatsDTO(
    Integer totalDocuments,
    Integer totalNodes,
    Map<String, Integer> categories,
    List<RecentUploadDTO> recentUploads
) {
    public record RecentUploadDTO(
        String id,
        String filename,
        String category,
        String uploadedAt
    ) {}
}

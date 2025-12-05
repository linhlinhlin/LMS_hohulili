package com.example.lms.dto.ai.external;

import java.util.List;

/**
 * Response từ AI Backend khi lấy danh sách documents
 * Maps to: GET /api/v1/knowledge/list
 */
public record KnowledgeListResponse(
    List<KnowledgeDocument> documents,
    Integer page,
    Integer limit
) {
    public record KnowledgeDocument(
        String id,
        String filename,
        String category,
        Integer nodes_count,
        String uploaded_by
    ) {}
}

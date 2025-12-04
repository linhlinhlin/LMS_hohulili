package com.example.lms.dto.ai;

/**
 * DTO cho Frontend hiển thị document trong Knowledge Base
 */
public record KnowledgeDocumentDTO(
    String id,
    String filename,
    String category,
    Integer nodesCount,
    String uploadedBy
) {}

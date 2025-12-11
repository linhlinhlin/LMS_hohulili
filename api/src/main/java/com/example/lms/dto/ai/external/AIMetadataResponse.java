package com.example.lms.dto.ai.external;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * Metadata DTO từ AI Service response.
 * Chứa thông tin về processing time, model, agent type và analytics data.
 * 
 * Updated: 10/12/2025 - Thêm analytics fields theo yêu cầu từ Team AI
 */
public record AIMetadataResponse(
    @JsonProperty("processing_time")
    Double processingTime,
    
    String model,
    
    @JsonProperty("agent_type")
    String agentType,
    
    @JsonProperty("tools_used")
    List<ToolUsed> toolsUsed,
    
    // Analytics fields - Added for LMS integration
    @JsonProperty("topics_accessed")
    List<String> topicsAccessed,
    
    @JsonProperty("confidence_score")
    Double confidenceScore,
    
    @JsonProperty("document_ids_used")
    List<String> documentIdsUsed,
    
    @JsonProperty("query_type")
    String queryType
) {
    /**
     * Tool usage information from AI Service
     */
    public record ToolUsed(
        String name,
        String description
    ) {}
}

package com.example.lms.dto.ai.external;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Metadata DTO từ AI Service response.
 * Chứa thông tin về processing time, model, agent type.
 */
public record AIMetadataResponse(
    @JsonProperty("processing_time")
    Double processingTime,
    
    String model,
    
    @JsonProperty("agent_type")
    String agentType
) {}

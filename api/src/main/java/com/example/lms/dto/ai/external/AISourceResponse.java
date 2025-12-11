package com.example.lms.dto.ai.external;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * Source DTO từ AI Service response.
 * Chứa thông tin tài liệu tham khảo với bounding boxes cho source highlighting.
 * 
 * Updated: 10/12/2025 - Thêm bounding_boxes support theo API spec từ Team AI
 */
public record AISourceResponse(
    String title,
    
    String content,
    
    @JsonProperty("image_url")
    String imageUrl,
    
    @JsonProperty("page_number")
    Integer pageNumber,
    
    @JsonProperty("document_id")
    String documentId,
    
    @JsonProperty("bounding_boxes")
    List<BoundingBox> boundingBoxes
) {
    /**
     * Bounding box coordinates for PDF highlighting.
     * Coordinates are percentages (0-100) relative to page dimensions.
     */
    public record BoundingBox(
        @JsonProperty("x0")
        Double x0,
        
        @JsonProperty("y0")
        Double y0,
        
        @JsonProperty("x1")
        Double x1,
        
        @JsonProperty("y1")
        Double y1
    ) {}
}

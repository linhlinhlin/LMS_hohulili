package com.example.lms.dto.ai;

import java.util.List;

/**
 * DTO cho source/citation từ AI response.
 * Chứa thông tin tài liệu tham khảo với bounding boxes cho frontend highlighting.
 * 
 * Updated: 10/12/2025 - Thêm bounding boxes support cho source highlighting
 */
public record SourceDTO(
    String title,
    String content,
    String url,
    String imageUrl,
    Integer pageNumber,
    String documentId,
    List<BoundingBoxDTO> boundingBoxes
) {
    /**
     * Bounding box coordinates for PDF highlighting.
     * Coordinates are percentages (0-100) relative to page dimensions.
     * 
     * Frontend sử dụng để vẽ highlight overlay trên PDF/image.
     */
    public record BoundingBoxDTO(
        Double x0,
        Double y0,
        Double x1,
        Double y1
    ) {}
    
    /**
     * Factory method để tạo SourceDTO từ AISourceResponse
     */
    public static SourceDTO fromAISource(com.example.lms.dto.ai.external.AISourceResponse source) {
        if (source == null) return null;
        
        List<BoundingBoxDTO> boxes = null;
        if (source.boundingBoxes() != null) {
            boxes = source.boundingBoxes().stream()
                .map(b -> new BoundingBoxDTO(b.x0(), b.y0(), b.x1(), b.y1()))
                .toList();
        }
        
        return new SourceDTO(
            source.title(),
            source.content(),
            source.imageUrl(), // Use imageUrl as url for backward compatibility
            source.imageUrl(),
            source.pageNumber(),
            source.documentId(),
            boxes
        );
    }
}

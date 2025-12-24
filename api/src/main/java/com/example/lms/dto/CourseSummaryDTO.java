package com.example.lms.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * DTO for course summary list views.
 * Standalone class for JPQL DTO Projection compatibility.
 * Updated Dec 2025: Added price fields for payment flow
 */
public class CourseSummaryDTO {
    private UUID id;
    private String code;
    private String title;
    private String description;
    private String status;
    private String teacherName;
    private int enrolledCount;
    private Instant createdAt;
    private Boolean enrolled;
    
    // Price fields (Dec 2025)
    private String priceType;
    private BigDecimal price;
    private BigDecimal salePrice;

    public CourseSummaryDTO() {}

    /**
     * Constructor for JPQL DTO Projection (legacy - no price).
     * Note: SIZE() returns Integer, so we accept int directly.
     */
    public CourseSummaryDTO(UUID id, String code, String title, String description, 
                            String status, String teacherName, int enrolledCount, 
                            Instant createdAt, Boolean enrolled) {
        this.id = id;
        this.code = code;
        this.title = title;
        this.description = description;
        this.status = status;
        this.teacherName = teacherName;
        this.enrolledCount = enrolledCount;
        this.createdAt = createdAt;
        this.enrolled = enrolled;
    }
    
    /**
     * Constructor for JPQL DTO Projection WITH price fields (Dec 2025).
     */
    public CourseSummaryDTO(UUID id, String code, String title, String description, 
                            String status, String teacherName, int enrolledCount, 
                            Instant createdAt, Boolean enrolled,
                            String priceType, BigDecimal price, BigDecimal salePrice) {
        this(id, code, title, description, status, teacherName, enrolledCount, createdAt, enrolled);
        this.priceType = priceType;
        this.price = price;
        this.salePrice = salePrice;
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getTeacherName() { return teacherName; }
    public void setTeacherName(String teacherName) { this.teacherName = teacherName; }
    public int getEnrolledCount() { return enrolledCount; }
    public void setEnrolledCount(int enrolledCount) { this.enrolledCount = enrolledCount; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Boolean getEnrolled() { return enrolled; }
    public void setEnrolled(Boolean enrolled) { this.enrolled = enrolled; }
    
    // Price getters/setters
    public String getPriceType() { return priceType; }
    public void setPriceType(String priceType) { this.priceType = priceType; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public BigDecimal getSalePrice() { return salePrice; }
    public void setSalePrice(BigDecimal salePrice) { this.salePrice = salePrice; }

    // Builder pattern
    public static CourseSummaryDTOBuilder builder() { return new CourseSummaryDTOBuilder(); }
    
    public static class CourseSummaryDTOBuilder {
        private CourseSummaryDTO dto = new CourseSummaryDTO();
        public CourseSummaryDTOBuilder id(UUID id) { dto.setId(id); return this; }
        public CourseSummaryDTOBuilder code(String code) { dto.setCode(code); return this; }
        public CourseSummaryDTOBuilder title(String title) { dto.setTitle(title); return this; }
        public CourseSummaryDTOBuilder description(String description) { dto.setDescription(description); return this; }
        public CourseSummaryDTOBuilder status(String status) { dto.setStatus(status); return this; }
        public CourseSummaryDTOBuilder teacherName(String teacherName) { dto.setTeacherName(teacherName); return this; }
        public CourseSummaryDTOBuilder enrolledCount(int enrolledCount) { dto.setEnrolledCount(enrolledCount); return this; }
        public CourseSummaryDTOBuilder createdAt(Instant createdAt) { dto.setCreatedAt(createdAt); return this; }
        public CourseSummaryDTOBuilder enrolled(Boolean enrolled) { dto.setEnrolled(enrolled); return this; }
        public CourseSummaryDTOBuilder priceType(String priceType) { dto.setPriceType(priceType); return this; }
        public CourseSummaryDTOBuilder price(BigDecimal price) { dto.setPrice(price); return this; }
        public CourseSummaryDTOBuilder salePrice(BigDecimal salePrice) { dto.setSalePrice(salePrice); return this; }
        public CourseSummaryDTO build() { return dto; }
    }
}


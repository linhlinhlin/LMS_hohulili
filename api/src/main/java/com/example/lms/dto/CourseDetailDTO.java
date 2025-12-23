package com.example.lms.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;

/**
 * DTO for course detail view.
 * Designed for JPQL Constructor Expression projection - all data loaded in single query.
 * SOTA Pattern: Google/Netflix DTO Projection Architecture (2025)
 * 
 * This DTO avoids lazy loading issues by:
 * 1. Only containing primitive/simple types
 * 2. Being constructed directly in JPQL query
 * 3. Never exposing JPA entity references
 */
public class CourseDetailDTO {
    // Core fields
    private UUID id;
    private String code;
    private String title;
    private String description;
    private String status;
    
    // Teacher info (flat structure - no lazy loading)
    private UUID teacherId;
    private String teacherName;
    
    // Counts (calculated in query)
    private int enrolledCount;
    private int chaptersCount;
    
    // Timestamps
    private Instant createdAt;
    private Instant updatedAt;
    
    // Extended info
    private UUID instructorId;
    private UUID categoryId;
    private String categoryName;
    private String welcomeMessage;
    private String courseInformation;
    private String benefits;
    private String introVideoUrl;
    private Integer credits;
    private String visibility;
    private String priceType;
    private BigDecimal price;
    private BigDecimal salePrice;

    // Default constructor
    public CourseDetailDTO() {}

    /**
     * Constructor for JPQL DTO Projection (core fields only).
     * JPQL cannot handle Set<> parameters, so teachingStaffIds and tags are loaded separately.
     */
    public CourseDetailDTO(UUID id, String code, String title, String description,
                           String status, UUID teacherId, String teacherName,
                           int enrolledCount, int chaptersCount,
                           Instant createdAt, Instant updatedAt,
                           UUID instructorId, UUID categoryId, String categoryName,
                           String welcomeMessage, String courseInformation, String benefits,
                           String introVideoUrl, Integer credits,
                           String visibility, String priceType,
                           BigDecimal price, BigDecimal salePrice) {
        this.id = id;
        this.code = code;
        this.title = title;
        this.description = description;
        this.status = status;
        this.teacherId = teacherId;
        this.teacherName = teacherName;
        this.enrolledCount = enrolledCount;
        this.chaptersCount = chaptersCount;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.instructorId = instructorId;
        this.categoryId = categoryId;
        this.categoryName = categoryName;
        this.welcomeMessage = welcomeMessage;
        this.courseInformation = courseInformation;
        this.benefits = benefits;
        this.introVideoUrl = introVideoUrl;
        this.credits = credits;
        this.visibility = visibility;
        this.priceType = priceType;
        this.price = price;
        this.salePrice = salePrice;
    }

    // Collections loaded separately to avoid N+1 and MultipleBagFetch issues
    private Set<UUID> teachingStaffIds;
    private Set<String> tags;

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
    public UUID getTeacherId() { return teacherId; }
    public void setTeacherId(UUID teacherId) { this.teacherId = teacherId; }
    public String getTeacherName() { return teacherName; }
    public void setTeacherName(String teacherName) { this.teacherName = teacherName; }
    public int getEnrolledCount() { return enrolledCount; }
    public void setEnrolledCount(int enrolledCount) { this.enrolledCount = enrolledCount; }
    public int getChaptersCount() { return chaptersCount; }
    public void setChaptersCount(int chaptersCount) { this.chaptersCount = chaptersCount; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public UUID getInstructorId() { return instructorId; }
    public void setInstructorId(UUID instructorId) { this.instructorId = instructorId; }
    public Set<UUID> getTeachingStaffIds() { return teachingStaffIds; }
    public void setTeachingStaffIds(Set<UUID> teachingStaffIds) { this.teachingStaffIds = teachingStaffIds; }
    public UUID getCategoryId() { return categoryId; }
    public void setCategoryId(UUID categoryId) { this.categoryId = categoryId; }
    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }
    public Set<String> getTags() { return tags; }
    public void setTags(Set<String> tags) { this.tags = tags; }
    public String getWelcomeMessage() { return welcomeMessage; }
    public void setWelcomeMessage(String welcomeMessage) { this.welcomeMessage = welcomeMessage; }
    public String getCourseInformation() { return courseInformation; }
    public void setCourseInformation(String courseInformation) { this.courseInformation = courseInformation; }
    public String getBenefits() { return benefits; }
    public void setBenefits(String benefits) { this.benefits = benefits; }
    public String getIntroVideoUrl() { return introVideoUrl; }
    public void setIntroVideoUrl(String introVideoUrl) { this.introVideoUrl = introVideoUrl; }
    public Integer getCredits() { return credits; }
    public void setCredits(Integer credits) { this.credits = credits; }
    public String getVisibility() { return visibility; }
    public void setVisibility(String visibility) { this.visibility = visibility; }
    public String getPriceType() { return priceType; }
    public void setPriceType(String priceType) { this.priceType = priceType; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public BigDecimal getSalePrice() { return salePrice; }
    public void setSalePrice(BigDecimal salePrice) { this.salePrice = salePrice; }

    // Builder pattern for convenience
    public static CourseDetailDTOBuilder builder() { return new CourseDetailDTOBuilder(); }

    public static class CourseDetailDTOBuilder {
        private CourseDetailDTO dto = new CourseDetailDTO();
        public CourseDetailDTOBuilder id(UUID id) { dto.setId(id); return this; }
        public CourseDetailDTOBuilder code(String code) { dto.setCode(code); return this; }
        public CourseDetailDTOBuilder title(String title) { dto.setTitle(title); return this; }
        public CourseDetailDTOBuilder description(String description) { dto.setDescription(description); return this; }
        public CourseDetailDTOBuilder status(String status) { dto.setStatus(status); return this; }
        public CourseDetailDTOBuilder teacherId(UUID teacherId) { dto.setTeacherId(teacherId); return this; }
        public CourseDetailDTOBuilder teacherName(String teacherName) { dto.setTeacherName(teacherName); return this; }
        public CourseDetailDTOBuilder enrolledCount(int enrolledCount) { dto.setEnrolledCount(enrolledCount); return this; }
        public CourseDetailDTOBuilder chaptersCount(int chaptersCount) { dto.setChaptersCount(chaptersCount); return this; }
        public CourseDetailDTOBuilder createdAt(Instant createdAt) { dto.setCreatedAt(createdAt); return this; }
        public CourseDetailDTOBuilder updatedAt(Instant updatedAt) { dto.setUpdatedAt(updatedAt); return this; }
        public CourseDetailDTOBuilder instructorId(UUID instructorId) { dto.setInstructorId(instructorId); return this; }
        public CourseDetailDTOBuilder teachingStaffIds(Set<UUID> ids) { dto.setTeachingStaffIds(ids); return this; }
        public CourseDetailDTOBuilder categoryId(UUID categoryId) { dto.setCategoryId(categoryId); return this; }
        public CourseDetailDTOBuilder categoryName(String categoryName) { dto.setCategoryName(categoryName); return this; }
        public CourseDetailDTOBuilder tags(Set<String> tags) { dto.setTags(tags); return this; }
        public CourseDetailDTOBuilder welcomeMessage(String welcomeMessage) { dto.setWelcomeMessage(welcomeMessage); return this; }
        public CourseDetailDTOBuilder courseInformation(String info) { dto.setCourseInformation(info); return this; }
        public CourseDetailDTOBuilder benefits(String benefits) { dto.setBenefits(benefits); return this; }
        public CourseDetailDTOBuilder introVideoUrl(String url) { dto.setIntroVideoUrl(url); return this; }
        public CourseDetailDTOBuilder credits(Integer credits) { dto.setCredits(credits); return this; }
        public CourseDetailDTOBuilder visibility(String visibility) { dto.setVisibility(visibility); return this; }
        public CourseDetailDTOBuilder priceType(String priceType) { dto.setPriceType(priceType); return this; }
        public CourseDetailDTOBuilder price(BigDecimal price) { dto.setPrice(price); return this; }
        public CourseDetailDTOBuilder salePrice(BigDecimal salePrice) { dto.setSalePrice(salePrice); return this; }
        public CourseDetailDTO build() { return dto; }
    }
}

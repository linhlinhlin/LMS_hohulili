package com.example.lms.dto;

import com.example.lms.entity.Package;
import java.time.Instant;
import java.util.UUID;

public class PackageDTO {
    private UUID id;
    private String name;
    private String description;
    private String subject;
    private UUID ownerId;
    private String ownerName;
    private String ownerEmail;
    private String visibility;
    private Integer capacity;
    private Integer questionCount;
    private Boolean isFull;
    private Boolean isDefault;
    private Instant createdAt;
    private Instant updatedAt;

    public PackageDTO() {}

    public PackageDTO(UUID id, String name, String description, String subject, UUID ownerId, String ownerName, String ownerEmail, String visibility, Integer capacity, Integer questionCount, Boolean isFull, Boolean isDefault, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.subject = subject;
        this.ownerId = ownerId;
        this.ownerName = ownerName;
        this.ownerEmail = ownerEmail;
        this.visibility = visibility;
        this.capacity = capacity;
        this.questionCount = questionCount;
        this.isFull = isFull;
        this.isDefault = isDefault;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    /**
     * SOTA: Constructor for JPQL DTO Projection.
     * COUNT() returns Long, so we accept Long and convert.
     * This enables direct DTO return from repository - no entity access needed.
     */
    public PackageDTO(UUID id, String name, String description, String subject, 
                      UUID ownerId, String ownerName, String ownerEmail, 
                      String visibility, Integer capacity, 
                      Long questionCount, Boolean isFull, Boolean isDefault, 
                      Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.subject = subject;
        this.ownerId = ownerId;
        this.ownerName = ownerName;
        this.ownerEmail = ownerEmail;
        this.visibility = visibility;
        this.capacity = capacity;
        this.questionCount = questionCount != null ? questionCount.intValue() : 0;
        this.isFull = isFull != null ? isFull : false;
        this.isDefault = isDefault != null ? isDefault : false;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // Getters and Setters
    public UUID getId() { return id; } public void setId(UUID id) { this.id = id; }
    public String getName() { return name; } public void setName(String name) { this.name = name; }
    public String getDescription() { return description; } public void setDescription(String description) { this.description = description; }
    public String getSubject() { return subject; } public void setSubject(String subject) { this.subject = subject; }
    public UUID getOwnerId() { return ownerId; } public void setOwnerId(UUID ownerId) { this.ownerId = ownerId; }
    public String getOwnerName() { return ownerName; } public void setOwnerName(String ownerName) { this.ownerName = ownerName; }
    public String getOwnerEmail() { return ownerEmail; } public void setOwnerEmail(String ownerEmail) { this.ownerEmail = ownerEmail; }
    public String getVisibility() { return visibility; } public void setVisibility(String visibility) { this.visibility = visibility; }
    public Integer getCapacity() { return capacity; } public void setCapacity(Integer capacity) { this.capacity = capacity; }
    public Integer getQuestionCount() { return questionCount; } public void setQuestionCount(Integer questionCount) { this.questionCount = questionCount; }
    public Boolean getIsFull() { return isFull; } public void setIsFull(Boolean isFull) { this.isFull = isFull; }
    public Boolean getIsDefault() { return isDefault; } public void setIsDefault(Boolean isDefault) { this.isDefault = isDefault; }
    public Instant getCreatedAt() { return createdAt; } public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; } public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public static PackageDTOBuilder builder() { return new PackageDTOBuilder(); }
    public static class PackageDTOBuilder {
        private PackageDTO p = new PackageDTO();
        public PackageDTOBuilder id(UUID id) { p.setId(id); return this; }
        public PackageDTOBuilder name(String name) { p.setName(name); return this; }
        public PackageDTOBuilder description(String description) { p.setDescription(description); return this; }
        public PackageDTOBuilder subject(String subject) { p.setSubject(subject); return this; }
        public PackageDTOBuilder ownerId(UUID ownerId) { p.setOwnerId(ownerId); return this; }
        public PackageDTOBuilder ownerName(String ownerName) { p.setOwnerName(ownerName); return this; }
        public PackageDTOBuilder ownerEmail(String ownerEmail) { p.setOwnerEmail(ownerEmail); return this; }
        public PackageDTOBuilder visibility(String visibility) { p.setVisibility(visibility); return this; }
        public PackageDTOBuilder capacity(Integer capacity) { p.setCapacity(capacity); return this; }
        public PackageDTOBuilder questionCount(Integer questionCount) { p.setQuestionCount(questionCount); return this; }
        public PackageDTOBuilder isFull(Boolean isFull) { p.setIsFull(isFull); return this; }
        public PackageDTOBuilder isDefault(Boolean isDefault) { p.setIsDefault(isDefault); return this; }
        public PackageDTOBuilder createdAt(Instant createdAt) { p.setCreatedAt(createdAt); return this; }
        public PackageDTOBuilder updatedAt(Instant updatedAt) { p.setUpdatedAt(updatedAt); return this; }
        public PackageDTO build() { return p; }
    }

    // Convert from Entity to DTO
    // SOTA: Avoid lazy loading by not accessing questions collection
    public static PackageDTO fromEntity(Package packageEntity) {
        if (packageEntity == null) return null;

        return PackageDTO.builder()
                .id(packageEntity.getId())
                .name(packageEntity.getName())
                .description(packageEntity.getDescription())
                .subject(packageEntity.getSubject())
                .ownerId(packageEntity.getOwner() != null ? packageEntity.getOwner().getId() : null)
                .ownerName(packageEntity.getOwner() != null ? packageEntity.getOwner().getFullName() : null)
                .ownerEmail(packageEntity.getOwner() != null ? packageEntity.getOwner().getEmail() : null)
                .visibility(packageEntity.getVisibility() != null ? packageEntity.getVisibility().name() : null)
                .capacity(packageEntity.getCapacity())
                // SOTA Fix: Don't call getQuestionCount() - it triggers lazy loading on questions
                // Set to 0 by default, use fromEntityWithCount() if count is needed
                .questionCount(0)
                .isFull(false)
                .isDefault(packageEntity.isDefaultPackage())
                .createdAt(packageEntity.getCreatedAt())
                .updatedAt(packageEntity.getUpdatedAt())
                .build();
    }

    // Convert from Entity with custom question count
    public static PackageDTO fromEntityWithCount(Package packageEntity, long questionCount) {
        PackageDTO dto = fromEntity(packageEntity);
        if (dto != null) {
            dto.setQuestionCount((int) questionCount);
            dto.setIsFull(packageEntity.getCapacity() != null && questionCount >= packageEntity.getCapacity());
        }
        return dto;
    }
}

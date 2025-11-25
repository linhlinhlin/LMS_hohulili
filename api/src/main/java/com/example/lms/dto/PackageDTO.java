package com.example.lms.dto;

import com.example.lms.entity.Package;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
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

    // Convert from Entity to DTO
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
                .questionCount(packageEntity.getQuestionCount())
                .isFull(packageEntity.isFull())
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

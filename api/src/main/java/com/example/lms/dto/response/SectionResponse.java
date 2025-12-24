package com.example.lms.dto.response;

import com.example.lms.entity.Section;
import com.example.lms.entity.Section.SectionType;
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
public class SectionResponse {
    private UUID id;
    private String title;
    private SectionType type;
    private String content;
    private String videoUrl;
    private String fileUrl;
    private Boolean isRequired;
    private Integer duration;
    private Integer orderIndex;
    private UUID lessonId;
    private Instant createdAt;
    private Instant updatedAt;

    public static SectionResponse fromEntity(Section section) {
        return SectionResponse.builder()
                .id(section.getId())
                .title(section.getTitle())
                .type(section.getType())
                .content(section.getContent())
                .videoUrl(section.getVideoUrl())
                .fileUrl(section.getFileUrl())
                .isRequired(section.getIsRequired())
                .duration(section.getDuration())
                .orderIndex(section.getOrderIndex())
                .lessonId(section.getLesson() != null ? section.getLesson().getId() : null)
                .createdAt(section.getCreatedAt())
                .updatedAt(section.getUpdatedAt())
                .build();
    }
}

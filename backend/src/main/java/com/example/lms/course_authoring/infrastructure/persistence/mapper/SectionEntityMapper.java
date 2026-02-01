package com.example.lms.course_authoring.infrastructure.persistence.mapper;

import com.example.lms.course_authoring.infrastructure.persistence.entity.SectionJpaEntity;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Mapper for Section entity.
 */
@Component
public class SectionEntityMapper {

    public SectionJpaEntity toEntity(
            UUID lessonId,
            String title,
            SectionJpaEntity.SectionType type,
            String content,
            String videoUrl,
            String fileUrl,
            Boolean isRequired,
            Integer duration,
            Integer orderIndex
    ) {
        return SectionJpaEntity.builder()
            .lessonId(lessonId)
            .title(title)
            .type(type != null ? type : SectionJpaEntity.SectionType.TEXT)
            .content(content)
            .videoUrl(videoUrl)
            .fileUrl(fileUrl)
            .isRequired(isRequired != null ? isRequired : false)
            .duration(duration != null ? duration : 0)
            .orderIndex(orderIndex != null ? orderIndex : 0)
            .build();
    }
}

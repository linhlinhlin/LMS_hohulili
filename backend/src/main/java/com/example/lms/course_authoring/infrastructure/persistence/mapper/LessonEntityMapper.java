package com.example.lms.course_authoring.infrastructure.persistence.mapper;

import com.example.lms.course_authoring.infrastructure.persistence.entity.LessonJpaEntity;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Mapper for Lesson entity.
 */
@Component
public class LessonEntityMapper {

    public LessonJpaEntity toEntity(
            UUID chapterId,
            String title,
            String description,
            LessonJpaEntity.LessonType type,
            String videoUrl,
            Integer durationMinutes,
            Integer orderIndex,
            Boolean isFree
    ) {
        return LessonJpaEntity.builder()
            .chapterId(chapterId)
            .title(title)
            .description(description)
            .type(type != null ? type : LessonJpaEntity.LessonType.VIDEO)
            .videoUrl(videoUrl)
            .durationMinutes(durationMinutes != null ? durationMinutes : 0)
            .orderIndex(orderIndex != null ? orderIndex : 0)
            .isFree(isFree != null ? isFree : false)
            .build();
    }
}

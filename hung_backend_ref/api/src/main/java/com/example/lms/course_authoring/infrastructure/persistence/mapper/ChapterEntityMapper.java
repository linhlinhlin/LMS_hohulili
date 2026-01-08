package com.example.lms.course_authoring.infrastructure.persistence.mapper;

import com.example.lms.course_authoring.infrastructure.persistence.entity.ChapterJpaEntity;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Mapper for Chapter entity.
 */
@Component
public class ChapterEntityMapper {

    public ChapterJpaEntity toEntity(UUID courseId, String title, String description, Integer orderIndex) {
        return ChapterJpaEntity.builder()
            .courseId(courseId)
            .title(title)
            .description(description)
            .orderIndex(orderIndex != null ? orderIndex : 0)
            .build();
    }
}

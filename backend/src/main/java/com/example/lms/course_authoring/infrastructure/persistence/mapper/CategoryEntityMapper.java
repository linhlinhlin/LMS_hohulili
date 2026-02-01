package com.example.lms.course_authoring.infrastructure.persistence.mapper;

import com.example.lms.course_authoring.infrastructure.persistence.entity.CategoryJpaEntity;
import org.springframework.stereotype.Component;

/**
 * Mapper for Category entity.
 * Note: Domain model not yet created, this maps to/from JPA entity.
 */
@Component
public class CategoryEntityMapper {

    public CategoryJpaEntity toEntity(String code, String name) {
        return CategoryJpaEntity.builder()
            .code(code)
            .name(name)
            .build();
    }
}

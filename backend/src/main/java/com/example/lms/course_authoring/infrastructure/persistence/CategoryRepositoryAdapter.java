package com.example.lms.course_authoring.infrastructure.persistence;

import com.example.lms.course_authoring.domain.model.Category;
import com.example.lms.course_authoring.domain.repository.CategoryRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CategoryJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class CategoryRepositoryAdapter implements CategoryRepository {

    private final CategoryJpaRepository jpaRepository;

    @Override
    public Optional<Category> findById(UUID id) {
        return jpaRepository.findById(id)
                .map(e -> new Category(e.getId(), e.getCode(), e.getName(), e.getPrefix()));
    }
}

package com.example.lms.course_authoring.domain.repository;

import com.example.lms.course_authoring.domain.model.Category;

import java.util.Optional;
import java.util.UUID;

public interface CategoryRepository {
    Optional<Category> findById(UUID id);
}

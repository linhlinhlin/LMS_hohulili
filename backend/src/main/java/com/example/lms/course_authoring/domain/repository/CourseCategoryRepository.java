package com.example.lms.course_authoring.domain.repository;

import com.example.lms.course_authoring.domain.model.CourseCategory;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CourseCategoryRepository {
    Optional<CourseCategory> findById(UUID id);
    List<CourseCategory> findAllRoots();
    List<CourseCategory> findChildrenOf(UUID parentId);
    List<CourseCategory> findAllActiveTree();
    List<CourseCategory> findAll();
    CourseCategory save(CourseCategory category);
    void deleteById(UUID id);
    boolean existsByCode(String code);
    boolean existsBySlug(String slug);
    boolean existsByPrefix(String prefix);
}

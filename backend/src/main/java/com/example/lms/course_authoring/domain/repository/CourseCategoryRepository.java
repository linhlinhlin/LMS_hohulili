package com.example.lms.course_authoring.domain.repository;

import com.example.lms.course_authoring.domain.model.CourseCategory;

import java.util.List;
import java.util.Map;
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

    /**
     * Counts APPROVED courses for every category that has at least one. Returns
     * a map keyed by category id; absent categories default to 0 at the call
     * site.
     *
     * <p>Used by the admin categories listing (issue #189, F-CAT2) so the UI
     * can show a "(47)" badge next to each category name without N+1 queries.
     */
    Map<UUID, Long> countApprovedCoursesByCategory();
}

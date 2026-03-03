package com.example.lms.course_authoring.domain.repository;

import com.example.lms.course_authoring.domain.model.CourseTag;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface CourseTagRepository {
    List<CourseTag> findAll();
    Optional<CourseTag> findById(UUID id);
    CourseTag save(CourseTag tag);
    void deleteById(UUID id);
    boolean existsByName(String name);
    boolean existsBySlug(String slug);
    List<CourseTag> findByCourseId(UUID courseId);
    void assignTagsToCourse(UUID courseId, Set<UUID> tagIds);
    void removeAllTagsFromCourse(UUID courseId);
    long countByCourseId(UUID courseId);
}

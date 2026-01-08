package com.example.lms.course_authoring.domain.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Domain repository port for Chapter aggregate.
 */
public interface ChapterRepositoryPort {

    void save(UUID courseId, String title, String description, Integer orderIndex);

    Optional<Object> findById(UUID id);

    List<Object> findByCourseId(UUID courseId);

    void deleteById(UUID id);
}

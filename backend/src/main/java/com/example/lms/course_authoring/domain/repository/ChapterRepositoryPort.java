package com.example.lms.course_authoring.domain.repository;

import java.util.UUID;

/**
 * Domain repository port for Chapter aggregate.
 */
public interface ChapterRepositoryPort {

    UUID save(UUID courseId, String title, String description, Integer orderIndex);

    void deleteById(UUID id);

    long countByCourseId(UUID courseId);
}

package com.example.lms.course_authoring.domain.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Domain repository port for Lesson aggregate.
 */
public interface LessonRepositoryPort {

    void save(UUID chapterId, String title, String description, String type, Integer orderIndex);

    Optional<Object> findById(UUID id);

    List<Object> findByChapterId(UUID chapterId);

    void deleteById(UUID id);
}

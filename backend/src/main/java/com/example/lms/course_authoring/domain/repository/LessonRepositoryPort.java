package com.example.lms.course_authoring.domain.repository;

import com.example.lms.shared.domain.model.ContentBlock;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Domain repository port for Lesson aggregate.
 */
public interface LessonRepositoryPort {

    UUID save(UUID chapterId, String title, String description, String type,
              String videoUrl, Integer durationMinutes, Integer orderIndex, Boolean isFree);

    boolean existsById(UUID id);

    void deleteById(UUID id);

    Optional<List<ContentBlock>> getContentBlocks(UUID lessonId);

    void saveContentBlocks(UUID lessonId, List<ContentBlock> contentBlocks);
}

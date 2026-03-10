package com.example.lms.course_authoring.application.port;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface CourseStructureCommandPort {

    ChapterSnapshot updateChapter(UUID courseId, UUID chapterId, String title, String description);

    LessonSnapshot updateLesson(UUID courseId, UUID chapterId, UUID lessonId, LessonUpdateData data);

    List<UUID> listLessonIds(UUID courseId, UUID chapterId);

    void deleteChapter(UUID courseId, UUID chapterId);

    void deleteLesson(UUID courseId, UUID chapterId, UUID lessonId);

    record ChapterSnapshot(
            UUID id,
            String title,
            String description,
            Integer orderIndex,
            Instant createdAt,
            Instant updatedAt
    ) {}

    record LessonUpdateData(
            String title,
            String description,
            String lessonType,
            String content,
            String videoUrl,
            Integer durationMinutes,
            Boolean isRequired,
            Boolean isPreview
    ) {}

    record LessonSnapshot(
            UUID id,
            String title,
            String description,
            String content,
            String videoUrl,
            String lessonType,
            Integer orderIndex,
            Integer durationMinutes,
            Boolean isRequired,
            Boolean isPreview,
            int sectionCount,
            Instant createdAt,
            Instant updatedAt
    ) {}
}

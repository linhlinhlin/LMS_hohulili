package com.example.lms.learning_delivery.infrastructure.persistence;

import com.example.lms.course_authoring.infrastructure.persistence.entity.ChapterJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.ChapterJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository;
import com.example.lms.learning_delivery.application.port.CourseLessonCountPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Adapter: implements CourseLessonCountPort using JPA repositories.
 * Lives in infrastructure — keeps application layer clean of JPA dependencies.
 */
@Component
@RequiredArgsConstructor
public class CourseLessonCountAdapter implements CourseLessonCountPort {

    private final ChapterJpaRepository chapterJpaRepository;
    private final LessonJpaRepository lessonJpaRepository;

    @Override
    public int countLessonsInCourse(UUID courseId) {
        List<ChapterJpaEntity> chapters = chapterJpaRepository.findByCourseIdOrderByOrderIndex(courseId);
        if (chapters.isEmpty()) return 0;
        List<UUID> chapterIds = chapters.stream().map(ChapterJpaEntity::getId).toList();
        return lessonJpaRepository.findByChapterIdIn(chapterIds).size();
    }
}

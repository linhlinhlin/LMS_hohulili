package com.example.lms.course_management.application.usecase;

import com.example.lms.course_management.domain.model.Course;
import com.example.lms.course_management.domain.model.CourseVersion;
import com.example.lms.course_management.infrastructure.persistence.PostgresCourseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PublishCourseUseCase {

    private final PostgresCourseRepository courseRepository;

    @Transactional
    public CourseVersion publish(UUID courseId) {
        log.info("Publishing course: {}", courseId);

        // 1. Load full aggregate with JOIN FETCH to prevent lazy loading issues during snapshotting
        Course course = courseRepository.findByIdWithContent(courseId)
                .orElseThrow(() -> new RuntimeException("Course not found: " + courseId));

        // 2. Execute Domain Logic
        course.publish(); // Validates not empty, changes status
        courseRepository.save(course); // Save status change

        // 3. Create Snapshot
        List<CourseVersion.ChapterSnapshot> snapshots = course.getChapters().stream()
                .map(this::mapChapterToSnapshot)
                .collect(Collectors.toList());

        // 4. Calculate Version Number
        Integer nextVersion = courseRepository.getNextVersionNumber(courseId);

        // 5. Save Version
        CourseVersion version = CourseVersion.builder()
                .courseId(course.getId())
                .versionNumber(nextVersion)
                .snapshotContent(snapshots)
                .build();

        return courseRepository.saveVersion(version);
    }

    private CourseVersion.ChapterSnapshot mapChapterToSnapshot(com.example.lms.course_management.domain.model.Chapter chapter) {
        List<CourseVersion.LessonSnapshot> lessonSnapshots = chapter.getLessons().stream()
                .map(this::mapLessonToSnapshot)
                .collect(Collectors.toList());

        return CourseVersion.ChapterSnapshot.builder()
                .id(chapter.getId())
                .title(chapter.getTitle())
                .orderIndex(chapter.getOrderIndex())
                .lessons(lessonSnapshots)
                .build();
    }

    private CourseVersion.LessonSnapshot mapLessonToSnapshot(com.example.lms.course_management.domain.model.Lesson lesson) {
        return CourseVersion.LessonSnapshot.builder()
                .id(lesson.getId())
                .title(lesson.getTitle())
                .type(lesson.getType().name())
                .contentUrl(lesson.getContentUrl())
                .contentHtml(lesson.getContentHtml())
                .durationSeconds(lesson.getDurationSeconds())
                .orderIndex(lesson.getOrderIndex())
                .isRequired(lesson.isRequired())
                .build();
    }
}

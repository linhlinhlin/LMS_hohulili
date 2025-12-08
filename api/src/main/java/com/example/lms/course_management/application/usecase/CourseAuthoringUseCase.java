package com.example.lms.course_management.application.usecase;

import com.example.lms.course_management.application.dto.AuthoringDTOs;
import com.example.lms.course_management.domain.model.Chapter;
import com.example.lms.course_management.domain.model.Course;
import com.example.lms.course_management.domain.model.Lesson;
import com.example.lms.course_management.infrastructure.persistence.PostgresCourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CourseAuthoringUseCase {

    private final PostgresCourseRepository courseRepository;

    @Transactional(readOnly = true)
    public AuthoringDTOs.CourseDraftDTO getCourseDraft(UUID courseId) {
        Course course = courseRepository.findByIdWithContent(courseId)
                .orElseThrow(() -> new RuntimeException("Course not found: " + courseId));

        return mapToDraftDTO(course);
    }

    @Transactional
    public void reorderChapters(UUID courseId, List<UUID> orderedChapterIds) {
        Course course = courseRepository.findByIdWithContent(courseId)
                .orElseThrow(() -> new RuntimeException("Course not found"));

        List<Chapter> chapters = course.getChapters();
        for (int i = 0; i < orderedChapterIds.size(); i++) {
            UUID chapterId = orderedChapterIds.get(i);
            int finalI = i;
            chapters.stream()
                    .filter(c -> c.getId().equals(chapterId))
                    .findFirst()
                    .ifPresent(c -> c.setOrderIndex(finalI + 1));
        }
        courseRepository.save(course);
    }

    @Transactional
    public void reorderLessons(UUID chapterId, List<UUID> orderedLessonIds) {
        // Find Aggregate Root by Child ID
        Course course = courseRepository.findByChapterId(chapterId)
                .orElseThrow(() -> new RuntimeException("Course not found for chapter: " + chapterId));

        // Find Chapter within Course
        Chapter chapter = course.getChapters().stream()
                .filter(c -> c.getId().equals(chapterId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Chapter not found in course"));

        // Reorder
        List<Lesson> lessons = chapter.getLessons();
        for (int i = 0; i < orderedLessonIds.size(); i++) {
            UUID lessonId = orderedLessonIds.get(i);
            int finalI = i;
            lessons.stream()
                    .filter(l -> l.getId().equals(lessonId))
                    .findFirst()
                    .ifPresent(l -> l.setOrderIndex(finalI + 1));
        }
        
        courseRepository.save(course);
    }

    @Transactional
    public void updateLesson(UUID lessonId, AuthoringDTOs.UpdateLessonRequest request) {
        // Find Aggregate Root
        Course course = courseRepository.findByLessonId(lessonId)
                .orElseThrow(() -> new RuntimeException("Course not found for lesson: " + lessonId));
        
        // Find Chapter and Lesson
        // Optimization: Could flatten search if we don't need chapter context, 
        // but traversing hierarchy is safer.
        Lesson targetLesson = null;
        for (Chapter ch : course.getChapters()) {
            for (Lesson l : ch.getLessons()) {
                if (l.getId().equals(lessonId)) {
                    targetLesson = l;
                    break;
                }
            }
            if (targetLesson != null) break;
        }
        
        if (targetLesson == null) {
            throw new RuntimeException("Lesson not found in course structure");
        }
        
        // Update fields
        if (request.getTitle() != null) targetLesson.setTitle(request.getTitle());
        if (request.getContentUrl() != null) targetLesson.setContentUrl(request.getContentUrl());
        if (request.getContentHtml() != null) targetLesson.setContentHtml(request.getContentHtml());
        if (request.getDurationSeconds() != null) targetLesson.setDurationSeconds(request.getDurationSeconds());
        if (request.getIsRequired() != null) targetLesson.setRequired(request.getIsRequired());
        
        courseRepository.save(course);
    }

    private AuthoringDTOs.CourseDraftDTO mapToDraftDTO(Course course) {
        List<AuthoringDTOs.ChapterDraftDTO> chapters = course.getChapters().stream()
                .sorted(Comparator.comparingInt(c -> c.getOrderIndex() != null ? c.getOrderIndex() : 999))
                .map(this::mapChapter)
                .collect(Collectors.toList());

        return AuthoringDTOs.CourseDraftDTO.builder()
                .id(course.getId())
                .code(course.getCode())
                .title(course.getTitle())
                .description(course.getDescription())
                .price(course.getPrice())
                .priceType(course.getPriceType() != null ? course.getPriceType().name() : null)
                .chapters(chapters)
                .build();
    }

    private AuthoringDTOs.ChapterDraftDTO mapChapter(Chapter chapter) {
        List<AuthoringDTOs.LessonDraftDTO> lessons = chapter.getLessons().stream()
                .sorted(Comparator.comparingInt(l -> l.getOrderIndex() != null ? l.getOrderIndex() : 999))
                .map(this::mapLesson)
                .collect(Collectors.toList());

        return AuthoringDTOs.ChapterDraftDTO.builder()
                .id(chapter.getId())
                .title(chapter.getTitle())
                .orderIndex(chapter.getOrderIndex())
                .lessons(lessons)
                .build();
    }

    private AuthoringDTOs.LessonDraftDTO mapLesson(Lesson lesson) {
        return AuthoringDTOs.LessonDraftDTO.builder()
                .id(lesson.getId())
                .title(lesson.getTitle())
                .type(lesson.getType().name())
                .contentUrl(lesson.getContentUrl())
                .contentHtml(lesson.getContentHtml())
                .durationSeconds(lesson.getDurationSeconds())
                .isRequired(lesson.isRequired())
                .orderIndex(lesson.getOrderIndex())
                .build();
    }
}

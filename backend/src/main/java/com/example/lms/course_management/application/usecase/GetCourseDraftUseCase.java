package com.example.lms.course_management.application.usecase;

import com.example.lms.course_management.application.dto.AuthoringDTOs;
import com.example.lms.course_authoring.domain.model.Chapter;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.model.Lesson;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Use case: Retrieve a course draft tree with chapters and lessons.
 * Single responsibility: read-only query for course authoring draft view.
 */
@Service
@RequiredArgsConstructor
public class GetCourseDraftUseCase {

    private final CourseRepository courseRepository;

    @Transactional(readOnly = true)
    public AuthoringDTOs.CourseDraftDTO execute(UUID courseId) {
        Course course = courseRepository.findByIdWithContent(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", courseId));

        return mapToDraftDTO(course);
    }

    // --- Mappers ---

    private AuthoringDTOs.CourseDraftDTO mapToDraftDTO(Course course) {
        List<AuthoringDTOs.ChapterDraftDTO> chapters = course.getChapters().stream()
                .sorted(Comparator.comparingInt(c -> c.getOrderIndex() != null ? c.getOrderIndex() : 999))
                .map(this::mapChapter)
                .collect(Collectors.toList());

        return AuthoringDTOs.CourseDraftDTO.builder()
                .id(course.getId())
                .code(course.getCode().getValue())
                .title(course.getTitle())
                .description(course.getDescription())
                .thumbnailUrl(course.getThumbnailUrl())
                .price(course.getPrice())
                .priceType(course.getPriceType().name())
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
                .type(lesson.getLessonType().name())
                .contentUrl(lesson.getVideoUrl())
                .contentHtml(lesson.getContent())
                .durationSeconds(lesson.getDurationMinutes() != null ? lesson.getDurationMinutes() * 60 : 0)
                .isRequired(lesson.getIsRequired())
                .orderIndex(lesson.getOrderIndex())
                .build();
    }
}

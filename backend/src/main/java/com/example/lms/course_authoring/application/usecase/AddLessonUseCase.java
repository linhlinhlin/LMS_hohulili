package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.application.dto.CreateLessonCommand;
import com.example.lms.course_authoring.application.dto.LessonResponse;
import com.example.lms.course_authoring.domain.model.Chapter;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.model.Lesson;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Use case for adding a lesson to a chapter.
 */
@Service
@RequiredArgsConstructor
public class AddLessonUseCase {

    private final CourseRepository courseRepository;

    @Transactional
    public LessonResponse execute(CreateLessonCommand command) {
        // Find course with content
        Course course = courseRepository.findByIdWithContent(command.courseId())
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", command.courseId()));

        // Check ownership
        if (!course.isOwnedBy(command.userId())) {
            throw new UnauthorizedException("thêm bài học vào", "khóa học này");
        }

        // Find chapter
        Chapter chapter = course.getChapters().stream()
                .filter(c -> c.getId().equals(command.chapterId()))
                .findFirst()
                .orElseThrow(() -> new EntityNotFoundException("Chương", command.chapterId()));

        // Parse lesson type
        Lesson.LessonType lessonType = parseLessonType(command.lessonType());

        // Add lesson
        Lesson lesson = chapter.addLesson(command.title(), command.description(), lessonType);

        // Update lesson content if provided
        if (command.content() != null) {
            lesson.updateContent(command.content());
        }
        if (command.videoUrl() != null) {
            lesson.updateVideoUrl(command.videoUrl());
        }
        lesson.updateSettings(command.durationMinutes(), command.isRequired(), command.isPreview());

        // Save course
        courseRepository.save(course);

        return LessonResponse.from(lesson);
    }

    private Lesson.LessonType parseLessonType(String lessonType) {
        if (lessonType == null || lessonType.isBlank()) {
            return Lesson.LessonType.LECTURE;
        }
        try {
            return Lesson.LessonType.valueOf(lessonType.toUpperCase());
        } catch (IllegalArgumentException e) {
            return Lesson.LessonType.LECTURE;
        }
    }
}

package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.application.dto.UpdateLessonCommand;
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
 * Use case for updating a lesson.
 */
@Service
@RequiredArgsConstructor
public class UpdateLessonUseCase {

    private final CourseRepository courseRepository;

    @Transactional
    public LessonResponse execute(UpdateLessonCommand command) {
        // Find course with content
        Course course = courseRepository.findByIdWithContent(command.courseId())
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", command.courseId()));

        // Check ownership
        // Check ownership
        if (!course.isOwnedBy(command.userId()) && !command.isAdmin()) {
            throw new UnauthorizedException("chỉnh sửa bài học trong", "khóa học này");
        }

        // Find lesson (either by chapterId + lessonId, or scan all chapters if chapterId is null)
        Chapter foundChapter = null;
        Lesson lesson = null;
        
        if (command.chapterId() != null) {
            // Fast path: chapterId is provided
            foundChapter = course.getChapters().stream()
                    .filter(c -> c.getId().equals(command.chapterId()))
                    .findFirst()
                    .orElseThrow(() -> new EntityNotFoundException("Chương", command.chapterId()));
            lesson = foundChapter.findLesson(command.lessonId())
                    .orElseThrow(() -> new EntityNotFoundException("Bài học", command.lessonId()));
        } else {
            // Slow path: scan all chapters to find lesson
            for (Chapter ch : course.getChapters()) {
                var foundLesson = ch.findLesson(command.lessonId());
                if (foundLesson.isPresent()) {
                    foundChapter = ch;
                    lesson = foundLesson.get();
                    break;
                }
            }
            if (lesson == null) {
                throw new EntityNotFoundException("Bài học", command.lessonId());
            }
        }

        // Parse lesson type
        Lesson.LessonType lessonType = parseLessonType(command.lessonType());

        // Update lesson
        lesson.updateInfo(command.title(), command.description(), lessonType);
        
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
            return null;
        }
        try {
            return Lesson.LessonType.valueOf(lessonType.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}

package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.application.dto.ChapterResponse;
import com.example.lms.course_authoring.domain.model.Chapter;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Use case for reordering lessons in a chapter.
 */
@Service
@RequiredArgsConstructor
public class ReorderLessonsUseCase {

    private final CourseRepository courseRepository;

    @Transactional
    public ChapterResponse execute(UUID courseId, UUID chapterId, UUID userId, List<UUID> lessonIds) {
        // Find course with content
        Course course = courseRepository.findByIdWithContent(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", courseId));

        // Check ownership
        if (!course.isOwnedBy(userId)) {
            throw new UnauthorizedException("sắp xếp lại bài học trong", "khóa học này");
        }

        // Find chapter
        Chapter chapter = course.getChapters().stream()
                .filter(c -> c.getId().equals(chapterId))
                .findFirst()
                .orElseThrow(() -> new EntityNotFoundException("Chương", chapterId));

        // Reorder lessons (domain logic handles validation)
        chapter.reorderLessons(lessonIds);

        // Save course
        courseRepository.save(course);

        return ChapterResponse.fromWithLessons(chapter);
    }
}

package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.application.dto.UpdateChapterCommand;
import com.example.lms.course_authoring.application.dto.ChapterResponse;
import com.example.lms.course_authoring.domain.model.Chapter;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Use case for updating a chapter.
 */
@Service
@RequiredArgsConstructor
public class UpdateChapterUseCase {

    private final CourseRepository courseRepository;

    @Transactional
    public ChapterResponse execute(UpdateChapterCommand command) {
        // Find course with content
        Course course = courseRepository.findByIdWithContent(command.courseId())
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", command.courseId()));

        // Check ownership
        // Check ownership
        if (!course.isOwnedBy(command.userId()) && !command.isAdmin()) {
            throw new UnauthorizedException("chỉnh sửa chương trong", "khóa học này");
        }

        // Find chapter
        Chapter chapter = course.getChapters().stream()
                .filter(c -> c.getId().equals(command.chapterId()))
                .findFirst()
                .orElseThrow(() -> new EntityNotFoundException("Chương", command.chapterId()));

        // Update chapter
        chapter.updateInfo(command.title(), command.description());

        // Save course
        courseRepository.save(course);

        return ChapterResponse.from(chapter);
    }
}

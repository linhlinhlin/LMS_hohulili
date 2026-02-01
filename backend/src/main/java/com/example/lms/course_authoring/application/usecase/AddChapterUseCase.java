package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.application.dto.CreateChapterCommand;
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
 * Use case for adding a chapter to a course.
 */
@Service
@RequiredArgsConstructor
public class AddChapterUseCase {

    private final CourseRepository courseRepository;

    @Transactional
    public ChapterResponse execute(CreateChapterCommand command) {
        // Find course
        Course course = courseRepository.findById(command.courseId())
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", command.courseId()));

        // Check ownership
        if (!course.isOwnedBy(command.userId())) {
            throw new UnauthorizedException("thêm chương vào", "khóa học này");
        }

        // Add chapter (domain logic handles validation)
        Chapter chapter = course.addChapter(command.title(), command.description());

        // Save course
        courseRepository.save(course);

        return ChapterResponse.from(chapter);
    }
}

package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.application.dto.CourseResponse;
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
 * Use case for reordering chapters in a course.
 */
@Service
@RequiredArgsConstructor
public class ReorderChaptersUseCase {

    private final CourseRepository courseRepository;

    @Transactional
    public CourseResponse execute(UUID courseId, UUID userId, List<UUID> chapterIds) {
        // Find course with content
        Course course = courseRepository.findByIdWithContent(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", courseId));

        // Check ownership
        if (!course.isOwnedBy(userId)) {
            throw new UnauthorizedException("sắp xếp lại chương trong", "khóa học này");
        }

        // Reorder chapters (domain logic handles validation)
        course.reorderChapters(chapterIds);

        // Save course
        course = courseRepository.save(course);

        return CourseResponse.from(course);
    }
}

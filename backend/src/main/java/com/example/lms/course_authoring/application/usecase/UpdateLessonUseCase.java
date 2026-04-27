package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.application.dto.LessonResponse;
import com.example.lms.course_authoring.application.dto.UpdateLessonCommand;
import com.example.lms.course_authoring.application.port.CourseStructureCommandPort;
import com.example.lms.course_authoring.domain.model.Course;
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
    private final CourseStructureCommandPort courseStructureCommandPort;
    private final CourseDraftMutationUseCase courseDraftMutationUseCase;

    @Transactional
    public LessonResponse execute(UpdateLessonCommand command) {
        Course course = courseRepository.findById(command.courseId())
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", command.courseId()));

        if (!course.isOwnedBy(command.userId()) && !command.isAdmin()) {
            throw new UnauthorizedException("chỉnh sửa bài học trong", "khóa học này");
        }

        courseDraftMutationUseCase.requireEditableCourse(command.courseId());

        var savedLesson = courseStructureCommandPort.updateLesson(
                command.courseId(),
                command.chapterId(),
                command.lessonId(),
                new CourseStructureCommandPort.LessonUpdateData(
                        command.title(),
                        command.description(),
                        command.lessonType(),
                        command.content(),
                        command.videoUrl(),
                        command.durationMinutes(),
                        command.isRequired(),
                        command.isPreview()
                )
        );
        courseDraftMutationUseCase.markCourseChanged(command.courseId());
        return new LessonResponse(
                savedLesson.id(),
                savedLesson.title(),
                savedLesson.description(),
                savedLesson.content(),
                savedLesson.videoUrl(),
                savedLesson.lessonType(),
                savedLesson.orderIndex(),
                savedLesson.durationMinutes(),
                command.isRequired(),
                savedLesson.isPreview(),
                savedLesson.sectionCount(),
                savedLesson.createdAt(),
                savedLesson.updatedAt()
        );
    }
}

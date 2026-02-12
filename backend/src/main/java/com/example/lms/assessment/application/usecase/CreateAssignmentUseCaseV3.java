package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.domain.model.Assignment;
import com.example.lms.assessment.domain.repository.AssignmentRepository;
import com.example.lms.assessment.application.dto.CreateAssignmentCommand;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Use case for creating an assignment.
 * V3 - Uses pure domain models only.
 *
 * Clean Architecture: Application layer depends on Domain layer only.
 * Business rule: Assignments are only allowed for INSTRUCTOR_LED courses.
 */
@Service("createAssignmentUseCaseV3")
@RequiredArgsConstructor
public class CreateAssignmentUseCaseV3 {

    private static final Logger log = LoggerFactory.getLogger(CreateAssignmentUseCaseV3.class);

    private final AssignmentRepository assignmentRepository;
    private final CourseRepository courseRepository;

    @Transactional
    public UUID execute(CreateAssignmentCommand command) {
        log.info("Creating assignment {} (V3)", command.title());

        // Validate course exists and is INSTRUCTOR_LED
        Course course = courseRepository.findById(command.courseId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khóa học"));

        if (course.getDeliveryMode() != Course.DeliveryMode.INSTRUCTOR_LED) {
            throw new IllegalStateException(
                "Bài tập chỉ áp dụng cho khóa học dạng Lớp học (INSTRUCTOR_LED). " +
                "Khóa học \"" + course.getTitle() + "\" đang ở chế độ Tự học (SELF_PACED)."
            );
        }

        // Parse assignment type
        Assignment.AssignmentType type = Assignment.AssignmentType.FILE_UPLOAD;
        try {
            type = Assignment.AssignmentType.valueOf(command.type());
        } catch (IllegalArgumentException ignored) {}

        // Create domain model using factory method
        Assignment assignment = Assignment.create(
            command.courseId(),
            command.lessonId(),
            command.title(),
            command.description(),
            command.instructions(),
            type,
            command.maxScore()
        );

        // Set due date if provided
        if (command.dueDate() != null) {
            assignment.setDueDate(command.dueDate());
        }

        // Save via repository port
        Assignment saved = assignmentRepository.save(assignment);

        log.info("Assignment {} created with ID {} (V3)", command.title(), saved.getId().value());

        // Handle allocation via domain port
        if (command.distributionType() != null) {
            assignmentRepository.allocate(
                saved.getId().value(),
                command.distributionType(),
                command.studentIds()
            );
        }

        return saved.getId().value();
    }
}

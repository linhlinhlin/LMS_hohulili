package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.application.dto.CreateAssignmentCommand;
import com.example.lms.assessment.domain.model.Assignment;
import com.example.lms.assessment.domain.repository.AssignmentRepository;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Use case for creating an assignment.
 *
 * <p>Delivery-mode rules:
 * <ul>
 *   <li>SELF_PACED courses use course-wide assignments.</li>
 *   <li>INSTRUCTOR_LED courses may additionally target classes or specific students.</li>
 * </ul>
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

        Course course = courseRepository.findById(command.courseId())
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay khoa hoc"));

        String distributionType = resolveDistributionType(
                command.distributionType(),
                command.classId(),
                command.studentIds()
        );
        if (course.getDeliveryMode() == Course.DeliveryMode.SELF_PACED && !"ALL_STUDENTS".equals(distributionType)) {
            throw new IllegalArgumentException("SELF_PACED assignments only support ALL_STUDENTS distribution");
        }

        Assignment.AssignmentType type = Assignment.AssignmentType.FILE_UPLOAD;
        try {
            type = Assignment.AssignmentType.valueOf(command.type());
        } catch (IllegalArgumentException ignored) {
            // Fall back to FILE_UPLOAD for legacy/empty values.
        }

        Assignment assignment = Assignment.create(
                command.courseId(),
                command.lessonId(),
                command.title(),
                command.description(),
                command.instructions(),
                type,
                command.maxScore()
        );

        if (command.dueDate() != null) {
            assignment.setDueDate(command.dueDate());
        }

        if (command.status() != null && !command.status().isBlank()) {
            try {
                assignment.changeStatus(Assignment.AssignmentStatus.valueOf(command.status().toUpperCase()));
            } catch (IllegalArgumentException ex) {
                throw new IllegalArgumentException("Invalid assignment status: " + command.status());
            }
        }

        Assignment saved = assignmentRepository.save(assignment);
        log.info("Assignment {} created with ID {} (V3)", command.title(), saved.getId().value());

        if (shouldAllocate(command, distributionType)) {
            assignmentRepository.allocate(
                    saved.getId().value(),
                    distributionType,
                    command.classId(),
                    command.studentIds()
            );
        }

        return saved.getId().value();
    }

    private boolean shouldAllocate(CreateAssignmentCommand command, String distributionType) {
        return command.distributionType() != null
                || command.classId() != null
                || (command.studentIds() != null && !command.studentIds().isEmpty())
                || !"ALL_STUDENTS".equals(distributionType);
    }

    private String resolveDistributionType(String distributionType, UUID classId, List<UUID> studentIds) {
        if (distributionType != null && !distributionType.isBlank()) {
            return distributionType.trim().toUpperCase();
        }
        if (classId != null) {
            return "CLASS";
        }
        if (studentIds != null && !studentIds.isEmpty()) {
            return "SPECIFIC_STUDENTS";
        }
        return "ALL_STUDENTS";
    }
}

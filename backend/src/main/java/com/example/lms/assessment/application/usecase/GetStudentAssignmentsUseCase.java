package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.application.dto.StudentAssignmentResponse;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentSubmissionJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentSubmissionJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.EnrollmentJpaEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Query use case: fetches all assignments visible to a student.
 *
 * Flow:
 * 1. Get student's active enrollments -> extract courseIds
 * 2. Get PUBLISHED assignments for those courses (batch query)
 * 3. Get student's submissions for those assignments (batch query)
 * 4. Map to StudentAssignmentResponse with computed status/isLate fields
 */
@Service
@RequiredArgsConstructor
public class GetStudentAssignmentsUseCase {

    private final JpaEnrollmentRepository enrollmentRepository;
    private final AssignmentJpaRepository assignmentRepository;
    private final AssignmentSubmissionJpaRepository submissionRepository;
    private final JpaCourseRepository courseRepository;

    @Transactional(readOnly = true)
    public List<StudentAssignmentResponse> execute(UUID studentId) {
        // 1. Get student's active enrollments with class (single query with JOIN FETCH)
        List<EnrollmentJpaEntity> enrollments = enrollmentRepository.findActiveWithClass(studentId);
        if (enrollments.isEmpty()) {
            return List.of();
        }

        // 2. Extract course IDs from enrollments
        List<UUID> courseIds = enrollments.stream()
                .map(e -> e.getLearningClass().getCourseId())
                .distinct()
                .collect(Collectors.toList());

        // 3. Get PUBLISHED assignments for enrolled courses (batch query)
        List<AssignmentJpaEntity> assignments = assignmentRepository.findByCourseIdInAndStatus(
                courseIds, AssignmentJpaEntity.AssignmentStatus.PUBLISHED);
        if (assignments.isEmpty()) {
            return List.of();
        }

        // 4. Get student's submissions (batch query by studentId)
        List<AssignmentSubmissionJpaEntity> submissions = submissionRepository.findByStudentId(studentId);
        Map<UUID, AssignmentSubmissionJpaEntity> submissionByAssignment = submissions.stream()
                .collect(Collectors.toMap(
                        AssignmentSubmissionJpaEntity::getAssignmentId,
                        Function.identity(),
                        (a, b) -> a // In case of duplicates, keep first
                ));

        // 5. Build course title map (batch - all courses loaded in one query)
        List<CourseJpaEntity> courses = courseRepository.findAllById(courseIds);
        Map<UUID, String> courseTitleMap = courses.stream()
                .collect(Collectors.toMap(CourseJpaEntity::getId, CourseJpaEntity::getTitle));

        // 6. Map to response DTOs
        return assignments.stream()
                .map(a -> mapToResponse(a, submissionByAssignment.get(a.getId()), courseTitleMap))
                .sorted(Comparator.comparing(StudentAssignmentResponse::dueDate,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.toList());
    }

    /**
     * Get a single assignment detail for a student.
     */
    @Transactional(readOnly = true)
    public Optional<StudentAssignmentResponse> getById(UUID assignmentId, UUID studentId) {
        return assignmentRepository.findById(assignmentId)
                .map(assignment -> {
                    var submission = submissionRepository
                            .findByAssignmentIdAndStudentId(assignmentId, studentId)
                            .orElse(null);

                    String courseName = null;
                    if (assignment.getCourseId() != null) {
                        courseName = courseRepository.findById(assignment.getCourseId())
                                .map(CourseJpaEntity::getTitle)
                                .orElse(null);
                    }

                    Map<UUID, String> titleMap = courseName != null
                            ? Map.of(assignment.getCourseId(), courseName)
                            : Map.of();
                    return mapToResponse(assignment, submission, titleMap);
                });
    }

    private StudentAssignmentResponse mapToResponse(
            AssignmentJpaEntity assignment,
            AssignmentSubmissionJpaEntity submission,
            Map<UUID, String> courseTitleMap) {

        String status;
        boolean isLate = false;
        Double score = null;
        String feedback = null;
        Instant submittedAt = null;
        Instant gradedAt = null;
        String fileUrl = null;
        String fileName = null;
        String content = null;
        UUID submissionId = null;

        if (submission != null) {
            submissionId = submission.getId();
            submittedAt = submission.getSubmittedAt();
            score = submission.getGrade();
            feedback = submission.getFeedback();
            gradedAt = submission.getGradedAt();
            fileUrl = submission.getFileUrl();
            fileName = submission.getFileName();
            content = submission.getContent();

            // Compute isLate: submittedAt after dueDate
            if (submittedAt != null && assignment.getDueDate() != null) {
                isLate = submittedAt.isAfter(assignment.getDueDate());
            }

            // Map submission status to student-facing status
            status = switch (submission.getStatus()) {
                case DRAFT -> "DRAFT";
                case SUBMITTED -> isLate ? "LATE" : "SUBMITTED";
                case LATE -> "LATE";
                case GRADED -> "GRADED";
                case RETURNED -> "RETURNED";
                case RESUBMITTED -> "RESUBMITTED";
            };
        } else {
            // No submission yet
            if (assignment.getDueDate() != null && Instant.now().isAfter(assignment.getDueDate())) {
                status = "OVERDUE";
            } else {
                status = "NOT_SUBMITTED";
            }
        }

        String courseName = assignment.getCourseId() != null
                ? courseTitleMap.getOrDefault(assignment.getCourseId(), null)
                : null;

        return new StudentAssignmentResponse(
                assignment.getId(),
                assignment.getTitle(),
                assignment.getDescription(),
                assignment.getInstructions(),
                courseName,
                assignment.getCourseId(),
                assignment.getDueDate(),
                assignment.getMaxScore() != null ? assignment.getMaxScore().intValue() : null,
                status,
                isLate,
                score,
                feedback,
                submittedAt,
                gradedAt,
                fileUrl,
                fileName,
                content,
                submissionId,
                Boolean.TRUE.equals(assignment.getAllowLateSubmission()),
                assignment.getMaxAttempts()
        );
    }
}

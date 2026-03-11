package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.application.dto.StudentAssignmentResponse;
import com.example.lms.assessment.application.port.StudentAssessmentAccessPort;
import com.example.lms.assessment.application.port.StudentAssignmentQueryPort;
import com.example.lms.assessment.application.port.StudentAssignmentQueryPort.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
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

    private final StudentAssignmentQueryPort queryPort;
    private final StudentAssessmentAccessPort accessPort;

    @Transactional(readOnly = true)
    public List<StudentAssignmentResponse> execute(UUID studentId) {
        // 1. Get student's active enrollments
        List<EnrolledCourse> enrolledCourses = queryPort.findActiveEnrolledCourses(studentId);
        if (enrolledCourses.isEmpty()) {
            return List.of();
        }

        // 2. Extract course IDs
        List<UUID> courseIds = enrolledCourses.stream()
                .map(EnrolledCourse::courseId)
                .distinct()
                .collect(Collectors.toList());

        // 3. Get PUBLISHED assignments (batch query)
        List<AssignmentSummary> assignments = queryPort.findPublishedAssignmentsByCourseIds(courseIds);
        if (assignments.isEmpty()) {
            return List.of();
        }

        List<UUID> visibleAssignmentIds = accessPort.filterAccessibleAssignmentIds(
                assignments.stream().map(AssignmentSummary::id).toList(),
                studentId
        );
        if (visibleAssignmentIds.isEmpty()) {
            return List.of();
        }
        Set<UUID> visibleAssignmentIdSet = new HashSet<>(visibleAssignmentIds);
        assignments = assignments.stream()
                .filter(assignment -> visibleAssignmentIdSet.contains(assignment.id()))
                .toList();

        // 4. Get student's submissions (batch query)
        Map<UUID, SubmissionInfo> submissionByAssignment = queryPort.findLatestSubmissionsByStudent(studentId);

        // 5. Map to response DTOs
        return assignments.stream()
                .map(a -> mapToResponse(a, submissionByAssignment.get(a.id())))
                .sorted(Comparator.comparing(StudentAssignmentResponse::dueDate,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.toList());
    }

    /**
     * Get a single assignment detail for a student.
     */
    @Transactional(readOnly = true)
    public Optional<StudentAssignmentResponse> getById(UUID assignmentId, UUID studentId) {
        if (!accessPort.canAccessAssignment(assignmentId, studentId)) {
            return Optional.empty();
        }

        return queryPort.findAssignmentById(assignmentId)
                .map(assignment -> {
                    SubmissionInfo submission = queryPort.findSubmission(assignmentId, studentId).orElse(null);

                    return mapToResponse(
                            new AssignmentSummary(
                                    assignment.id(), assignment.title(), assignment.description(),
                                    assignment.instructions(), assignment.courseId(), assignment.courseName(),
                                    assignment.deliveryMode(), assignment.dueDate(),
                                    assignment.maxScore(), assignment.allowLateSubmission(), assignment.maxAttempts(),
                                    assignment.distributionType(), assignment.classId(), assignment.className()),
                            submission);
                });
    }

    private StudentAssignmentResponse mapToResponse(
            AssignmentSummary assignment,
            SubmissionInfo submission) {

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
            submissionId = submission.id();
            submittedAt = submission.submittedAt();
            score = submission.grade();
            feedback = submission.feedback();
            gradedAt = submission.gradedAt();
            fileUrl = submission.fileUrl();
            fileName = submission.fileName();
            content = submission.content();

            // Compute isLate: submittedAt after dueDate
            if (submittedAt != null && assignment.dueDate() != null) {
                isLate = submittedAt.isAfter(assignment.dueDate());
            }

            // Map submission status to student-facing status
            status = switch (submission.status()) {
                case "DRAFT" -> "DRAFT";
                case "SUBMITTED" -> isLate ? "LATE" : "SUBMITTED";
                case "LATE" -> "LATE";
                case "GRADED" -> "GRADED";
                case "RETURNED" -> "RETURNED";
                case "RESUBMITTED" -> "RESUBMITTED";
                default -> submission.status();
            };
        } else {
            // No submission yet
            if (assignment.dueDate() != null && Instant.now().isAfter(assignment.dueDate())) {
                status = "OVERDUE";
            } else {
                status = "NOT_SUBMITTED";
            }
        }

        return new StudentAssignmentResponse(
                assignment.id(),
                assignment.title(),
                assignment.description(),
                assignment.instructions(),
                assignment.courseName(),
                assignment.courseId(),
                assignment.deliveryMode(),
                assignment.distributionType(),
                assignment.classId(),
                assignment.className(),
                assignment.dueDate(),
                assignment.maxScore() != null ? assignment.maxScore().intValue() : null,
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
                Boolean.TRUE.equals(assignment.allowLateSubmission()),
                assignment.maxAttempts()
        );
    }
}

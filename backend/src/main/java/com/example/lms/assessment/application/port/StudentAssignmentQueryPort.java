package com.example.lms.assessment.application.port;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * CQRS query port for student assignment read operations.
 * Isolates the application layer from infrastructure JPA repositories.
 */
public interface StudentAssignmentQueryPort {

    List<EnrolledCourse> findActiveEnrolledCourses(UUID studentId);

    List<AssignmentSummary> findPublishedAssignmentsByCourseIds(List<UUID> courseIds);

    Map<UUID, SubmissionInfo> findLatestSubmissionsByStudent(UUID studentId);

    Optional<AssignmentDetail> findAssignmentById(UUID assignmentId);

    Optional<SubmissionInfo> findSubmission(UUID assignmentId, UUID studentId);

    Optional<String> findCourseTitle(UUID courseId);

    record EnrolledCourse(UUID courseId) {}

    record AssignmentSummary(
            UUID id,
            String title,
            String description,
            String instructions,
            UUID courseId,
            String courseName,
            String deliveryMode,
            Instant dueDate,
            Double maxScore,
            Boolean allowLateSubmission,
            Integer maxAttempts,
            String distributionType,
            UUID classId,
            String className
    ) {}

    record AssignmentDetail(
            UUID id,
            String title,
            String description,
            String instructions,
            UUID courseId,
            String courseName,
            String deliveryMode,
            Instant dueDate,
            Double maxScore,
            Boolean allowLateSubmission,
            Integer maxAttempts,
            String distributionType,
            UUID classId,
            String className
    ) {}

    record SubmissionInfo(
            UUID id,
            UUID assignmentId,
            Instant submittedAt,
            Double grade,
            String feedback,
            Instant gradedAt,
            String fileUrl,
            String fileName,
            String content,
            String status
    ) {}
}

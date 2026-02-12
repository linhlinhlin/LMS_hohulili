package com.example.lms.learning_delivery.application.port;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Application-layer query port for teacher analytics.
 * Abstracts cross-module read-only queries needed by TeacherAnalyticsUseCase.
 */
public interface TeacherAnalyticsQueryPort {

    List<CourseProjection> findCoursesByTeacherId(UUID teacherId);

    long countDistinctStudentsByCourseIds(List<UUID> courseIds);

    BigDecimal sumRevenueByCourseIds(List<UUID> courseIds);

    Double getAverageRatingByCourseId(UUID courseId);

    long countReviewsByCourseId(UUID courseId);

    List<UUID> findAssignmentIdsByCourseIds(List<UUID> courseIds);

    long countPendingSubmissionsByAssignmentIds(List<UUID> assignmentIds);

    Map<UUID, Long> countEnrollmentsByCourseIds(List<UUID> courseIds);

    record CourseProjection(UUID id, String title, String status) {}
}

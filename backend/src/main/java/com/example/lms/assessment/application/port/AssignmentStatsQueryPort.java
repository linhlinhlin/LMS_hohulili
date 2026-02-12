package com.example.lms.assessment.application.port;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Query port for assignment statistics (submissions, grades).
 * Implemented by infrastructure adapter.
 */
public interface AssignmentStatsQueryPort {
    Map<UUID, Long> countSubmissionsByAssignmentIds(List<UUID> ids);
    Map<UUID, Long> countGradedByAssignmentIds(List<UUID> ids);
    Map<UUID, Double> avgGradeByAssignmentIds(List<UUID> ids);
    Map<UUID, Long> countEnrolledStudentsByCourseIds(List<UUID> courseIds);
}

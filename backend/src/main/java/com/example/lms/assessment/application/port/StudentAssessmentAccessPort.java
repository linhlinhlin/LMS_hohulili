package com.example.lms.assessment.application.port;

import java.util.List;
import java.util.UUID;

/**
 * Access checks for student-facing assessment endpoints.
 */
public interface StudentAssessmentAccessPort {

    boolean canAccessAssignment(UUID assignmentId, UUID studentId);

    List<UUID> filterAccessibleAssignmentIds(List<UUID> assignmentIds, UUID studentId);

    boolean canAccessQuiz(UUID quizId, UUID studentId);

    List<UUID> filterAccessibleQuizIds(List<UUID> quizIds, UUID studentId);
}

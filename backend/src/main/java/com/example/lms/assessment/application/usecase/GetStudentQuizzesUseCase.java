package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.application.dto.StudentTaskResponse;
import com.example.lms.assessment.application.port.StudentAssessmentAccessPort;
import com.example.lms.assessment.application.port.StudentAssignmentQueryPort;
import com.example.lms.assessment.application.port.StudentAssignmentQueryPort.EnrolledCourse;
import com.example.lms.assessment.infrastructure.persistence.entity.QuizAssignmentJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.QuizAttemptJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizAssignmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizAttemptJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizJpaRepositoryV3;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Query use case: fetches all quiz/exam/practice items visible to a student.
 *
 * Flow:
 * 1. Get student's active enrollments → courseIds (reuse StudentAssignmentQueryPort)
 * 2. Query published quizzes accessible from those courses (native join query)
 * 3. Batch filter: accessPort.filterAccessibleQuizIds
 * 4. Get latest attempts per quiz (batch)
 * 5. Get assignment-level due dates (batch)
 * 6. Map status and build StudentTaskResponse
 */
@Service
@RequiredArgsConstructor
public class GetStudentQuizzesUseCase {

    private final StudentAssignmentQueryPort queryPort;
    private final StudentAssessmentAccessPort accessPort;
    private final QuizJpaRepositoryV3 quizRepository;
    private final QuizAttemptJpaRepository attemptRepository;
    private final QuizAssignmentJpaRepository quizAssignmentRepository;

    @Transactional(readOnly = true)
    public List<StudentTaskResponse> execute(UUID studentId) {
        // 1. Get enrolled courses
        List<EnrolledCourse> enrolledCourses = queryPort.findActiveEnrolledCourses(studentId);
        if (enrolledCourses.isEmpty()) {
            return List.of();
        }

        List<UUID> courseIds = enrolledCourses.stream()
                .map(EnrolledCourse::courseId)
                .distinct()
                .collect(Collectors.toList());

        // 2. Find published quizzes via native query (joins lesson→chapter→course + quiz_assignments)
        List<Object[]> quizRows = quizRepository.findPublishedQuizSummariesByCourseIds(courseIds);
        if (quizRows.isEmpty()) {
            return List.of();
        }

        // Parse native query results into QuizSummary records
        List<QuizSummary> quizSummaries = quizRows.stream()
                .map(this::parseQuizRow)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        if (quizSummaries.isEmpty()) {
            return List.of();
        }

        // 3. Batch access filter
        List<UUID> quizIds = quizSummaries.stream().map(QuizSummary::id).toList();
        List<UUID> accessibleIds = accessPort.filterAccessibleQuizIds(quizIds, studentId);
        if (accessibleIds.isEmpty()) {
            return List.of();
        }
        Set<UUID> accessibleIdSet = new HashSet<>(accessibleIds);
        quizSummaries = quizSummaries.stream()
                .filter(q -> accessibleIdSet.contains(q.id()))
                .toList();

        // 4. Get latest attempts per quiz (batch)
        List<UUID> filteredQuizIds = quizSummaries.stream().map(QuizSummary::id).toList();
        List<QuizAttemptJpaEntity> allAttempts = attemptRepository.findByQuizIdInAndStudentId(filteredQuizIds, studentId);
        Map<UUID, List<QuizAttemptJpaEntity>> attemptsByQuiz = allAttempts.stream()
                .collect(Collectors.groupingBy(QuizAttemptJpaEntity::getQuizId));

        // 5. Get assignment-level due date overrides (batch)
        List<QuizAssignmentJpaEntity> quizAssignments = quizAssignmentRepository.findByQuizIdIn(filteredQuizIds);
        Map<UUID, QuizAssignmentJpaEntity> assignmentByQuiz = quizAssignments.stream()
                .filter(a -> Boolean.TRUE.equals(a.getIsActive()))
                .collect(Collectors.toMap(
                        QuizAssignmentJpaEntity::getQuizId,
                        a -> a,
                        (a1, a2) -> a1.getAssignedAt() != null && a2.getAssignedAt() != null
                                && a1.getAssignedAt().isAfter(a2.getAssignedAt()) ? a1 : a2
                ));

        // 6. Map to StudentTaskResponse
        return quizSummaries.stream()
                .map(quiz -> mapToResponse(quiz, attemptsByQuiz.get(quiz.id()), assignmentByQuiz.get(quiz.id())))
                .collect(Collectors.toList());
    }

    private StudentTaskResponse mapToResponse(
            QuizSummary quiz,
            List<QuizAttemptJpaEntity> attempts,
            QuizAssignmentJpaEntity quizAssignment) {

        // Resolve due date: prefer quiz_assignment dueDate, fallback to quiz.dueAt
        Instant dueDate = quizAssignment != null && quizAssignment.getDueDate() != null
                ? quizAssignment.getDueDate()
                : quiz.dueAt();

        // Canvas SOTA: availableFrom / lockAt from quiz entity
        Instant availableFrom = quiz.availableFrom();
        Instant lockAt = quiz.lockAt();

        String status;
        boolean isLate = false;
        Double score = null;
        Integer maxScoreInt = null;
        Boolean isPassed = null;
        UUID attemptId = null;
        Instant submittedAt = null;
        Instant now = Instant.now();

        // Filter out EXPIRED (abandoned) attempts — they're stale and don't represent real work
        List<QuizAttemptJpaEntity> meaningfulAttempts = attempts != null
                ? attempts.stream()
                    .filter(a -> a.getStatus() != QuizAttemptJpaEntity.AttemptStatus.EXPIRED)
                    .toList()
                : List.of();
        int attemptCount = meaningfulAttempts.size();

        if (!meaningfulAttempts.isEmpty()) {
            // Find latest meaningful attempt by createdAt
            QuizAttemptJpaEntity latest = meaningfulAttempts.stream()
                    .max(Comparator.comparing(QuizAttemptJpaEntity::getCreatedAt))
                    .orElse(null);

            if (latest != null) {
                attemptId = latest.getId();
                submittedAt = latest.getSubmittedAt();
                score = latest.getScore();
                maxScoreInt = latest.getMaxScore() != null ? latest.getMaxScore().intValue() : null;
                isPassed = latest.getIsPassed();

                // Resolve status: if score exists, quiz is effectively graded
                status = switch (latest.getStatus()) {
                    case IN_PROGRESS -> "IN_PROGRESS";
                    case SUBMITTED -> score != null ? "GRADED" : "SUBMITTED";
                    case GRADED -> "GRADED";
                    case TIMEOUT -> score != null ? "GRADED" : "SUBMITTED";
                    case EXPIRED -> "NOT_STARTED"; // unreachable (filtered above)
                };

                if (submittedAt != null && dueDate != null && submittedAt.isAfter(dueDate)) {
                    isLate = true;
                }
            } else {
                status = resolveNoAttemptStatus(availableFrom, dueDate, lockAt, now);
            }
        } else {
            status = resolveNoAttemptStatus(availableFrom, dueDate, lockAt, now);
        }

        // Map assessmentType to workType
        String workType = switch (quiz.assessmentType()) {
            case "PRACTICE" -> "PRACTICE";
            case "EXAM" -> "EXAM";
            default -> "QUIZ"; // ASSESSMENT → QUIZ
        };

        return new StudentTaskResponse(
                quiz.id(),
                workType,
                quiz.title(),
                quiz.description(),
                quiz.courseId(),
                quiz.courseName(),
                dueDate,
                availableFrom,
                lockAt,
                status,
                isLate,
                score,
                maxScoreInt != null ? maxScoreInt : (quiz.passingScore() != null ? 100 : null),
                null, // feedback
                null, // submissionId (assignment-only)
                submittedAt,
                null, // fileUrl
                null, // fileName
                attemptId,
                quiz.timeLimitMinutes(),
                quiz.maxAttempts(),
                quiz.questionCount(),
                quiz.passingScore(),
                isPassed,
                attemptCount,
                quiz.requiresPassword()
        );
    }

    /**
     * Canvas SOTA status resolution (no attempts):
     * - Before availableFrom → NOT_AVAILABLE
     * - After lockAt → LOCKED
     * - After dueDate (no lockAt) → OVERDUE
     * - Otherwise → NOT_STARTED (open for attempt)
     */
    private String resolveNoAttemptStatus(Instant availableFrom, Instant dueDate, Instant lockAt, Instant now) {
        if (availableFrom != null && now.isBefore(availableFrom)) {
            return "NOT_AVAILABLE";
        }
        if (lockAt != null && now.isAfter(lockAt)) {
            return "LOCKED";
        }
        if (dueDate != null && now.isAfter(dueDate)) {
            return "OVERDUE";
        }
        return "NOT_STARTED";
    }

    private QuizSummary parseQuizRow(Object[] row) {
        try {
            UUID id = (UUID) row[0];
            String title = (String) row[1];
            String description = (String) row[2];
            String assessmentType = (String) row[3];
            Integer timeLimitMinutes = row[4] != null ? ((Number) row[4]).intValue() : null;
            Integer maxAttempts = row[5] != null ? ((Number) row[5]).intValue() : null;
            Integer passingScore = row[6] != null ? ((Number) row[6]).intValue() : null;
            Instant dueAt = toInstant(row[7]);
            UUID courseId = (UUID) row[8];
            String courseName = (String) row[9];
            int questionCount = row[10] != null ? ((Number) row[10]).intValue() : 0;
            String accessPassword = row.length > 11 ? (String) row[11] : null;
            Instant availableFrom = row.length > 12 ? toInstant(row[12]) : null;
            Instant lockAt = row.length > 13 ? toInstant(row[13]) : null;

            return new QuizSummary(id, title, description, assessmentType,
                    timeLimitMinutes, maxAttempts, passingScore, dueAt,
                    courseId, courseName, questionCount, accessPassword,
                    availableFrom, lockAt);
        } catch (Exception e) {
            return null;
        }
    }

    /** Safely convert native query timestamp (may be java.sql.Timestamp or OffsetDateTime) to Instant */
    private static Instant toInstant(Object value) {
        if (value == null) return null;
        if (value instanceof java.sql.Timestamp ts) return ts.toInstant();
        if (value instanceof java.time.OffsetDateTime odt) return odt.toInstant();
        if (value instanceof Instant inst) return inst;
        return null;
    }

    private record QuizSummary(
            UUID id, String title, String description, String assessmentType,
            Integer timeLimitMinutes, Integer maxAttempts, Integer passingScore,
            Instant dueAt, UUID courseId, String courseName, int questionCount,
            String accessPassword, Instant availableFrom, Instant lockAt
    ) {
        boolean requiresPassword() {
            return accessPassword != null && !accessPassword.isBlank();
        }
    }
}

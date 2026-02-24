package com.example.lms.learning_delivery.infrastructure.persistence;

import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentSubmissionJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.QuizAttemptJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentSubmissionJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizAttemptJpaRepository;
import com.example.lms.learning_delivery.application.port.StudentAnalyticsQueryPort;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.EnrollmentJpaEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class StudentAnalyticsQueryAdapter implements StudentAnalyticsQueryPort {

    private final JpaEnrollmentRepository enrollmentRepository;
    private final QuizAttemptJpaRepository quizAttemptRepository;
    private final AssignmentSubmissionJpaRepository assignmentSubmissionRepository;
    private final CertificateJpaRepository certificateRepository;
    private final com.example.lms.learning_delivery.infrastructure.persistence.repository.LearningStreakJpaRepository learningStreakRepository;

    @Override
    public long countCompletedCourses(UUID studentId) {
        return enrollmentRepository.countCompletedByStudentId(studentId);
    }

    @Override
    public double getAverageCompletionPercent(UUID studentId) {
        return enrollmentRepository.getAverageCompletionByStudentId(studentId);
    }

    @Override
    public long countActiveCourses(UUID studentId) {
        return enrollmentRepository.countActiveByStudentId(studentId);
    }

    @Override
    public Double getAverageQuizScorePercent(UUID studentId) {
        return quizAttemptRepository.getAverageScorePercentByStudentId(studentId);
    }

    @Override
    public long countGradedQuizAttempts(UUID studentId) {
        return quizAttemptRepository.countByStudentIdAndStatus(studentId, QuizAttemptJpaEntity.AttemptStatus.GRADED);
    }

    @Override
    public Double getAverageAssignmentGradePercent(UUID studentId) {
        return assignmentSubmissionRepository.getAverageGradePercentByStudentId(studentId);
    }

    @Override
    public long countGradedAssignments(UUID studentId) {
        return assignmentSubmissionRepository.countByStudentIdAndStatus(studentId, AssignmentSubmissionJpaEntity.SubmissionStatus.GRADED);
    }

    @Override
    public long countCertificates(UUID studentId) {
        return certificateRepository.countByStudentId(studentId);
    }

    @Override
    public List<GradedAttemptProjection> findRecentGradedQuizAttempts(UUID studentId, int limit) {
        List<QuizAttemptJpaEntity> graded = quizAttemptRepository.findGradedByStudentIdOrderBySubmittedAtDesc(studentId);
        return graded.stream()
                .limit(limit)
                .map(qa -> new GradedAttemptProjection(
                        qa.getScore() != null ? qa.getScore() : 0.0,
                        qa.getMaxScore() != null ? qa.getMaxScore() : 0.0,
                        qa.getSubmittedAt()
                ))
                .collect(Collectors.toList());
    }

    @Override
    public List<ActivityDateProjection> findActivityDates(UUID studentId) {
        return enrollmentRepository.findByStudentId(studentId).stream()
                .filter(e -> e.getLastAccessedAt() != null)
                .map(e -> new ActivityDateProjection(e.getLastAccessedAt()))
                .collect(Collectors.toList());
    }

    @Override
    public long countPerfectQuizAttempts(UUID studentId) {
        return quizAttemptRepository.countPerfectScoresByStudentId(studentId);
    }

    @Override
    public int getStreakDays(UUID studentId) {
        return learningStreakRepository.findByStudentId(studentId)
                .map(s -> s.getCurrentStreak())
                .orElse(0);
    }
}

package com.example.lms.assessment.infrastructure.persistence;

import com.example.lms.assessment.application.port.AssignmentStatsQueryPort;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentSubmissionJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class AssignmentStatsQueryAdapter implements AssignmentStatsQueryPort {

    private final AssignmentSubmissionJpaRepository submissionRepo;
    private final JpaEnrollmentRepository enrollmentRepo;

    @Override
    public Map<UUID, Long> countSubmissionsByAssignmentIds(List<UUID> ids) {
        if (ids.isEmpty()) return Map.of();
        return submissionRepo.countSubmissionsByAssignmentIds(ids).stream()
                .collect(Collectors.toMap(
                        row -> (UUID) row[0],
                        row -> (Long) row[1]
                ));
    }

    @Override
    public Map<UUID, Long> countGradedByAssignmentIds(List<UUID> ids) {
        if (ids.isEmpty()) return Map.of();
        return submissionRepo.countGradedByAssignmentIds(ids).stream()
                .collect(Collectors.toMap(
                        row -> (UUID) row[0],
                        row -> (Long) row[1]
                ));
    }

    @Override
    public Map<UUID, Double> avgGradeByAssignmentIds(List<UUID> ids) {
        if (ids.isEmpty()) return Map.of();
        return submissionRepo.avgGradeByAssignmentIds(ids).stream()
                .collect(Collectors.toMap(
                        row -> (UUID) row[0],
                        row -> (Double) row[1]
                ));
    }

    @Override
    public Map<UUID, Long> countEnrolledStudentsByCourseIds(List<UUID> courseIds) {
        if (courseIds.isEmpty()) return Map.of();
        return enrollmentRepo.countEnrollmentsByCourseIds(courseIds).stream()
                .collect(Collectors.toMap(
                        row -> (UUID) row[0],
                        row -> (Long) row[1]
                ));
    }
}

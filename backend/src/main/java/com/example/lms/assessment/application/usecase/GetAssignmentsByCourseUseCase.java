package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.application.dto.AssignmentDTOs;
import com.example.lms.assessment.application.port.AssignmentStatsQueryPort;
import com.example.lms.assessment.domain.model.Assignment;
import com.example.lms.assessment.domain.repository.AssignmentRepository;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GetAssignmentsByCourseUseCase {

    private final AssignmentRepository assignmentRepository;
    private final CourseRepository courseRepository;
    private final AssignmentStatsQueryPort statsQuery;

    @Transactional(readOnly = true)
    public List<AssignmentDTOs.AssignmentSummary> execute(UUID courseId) {
        var assignments = assignmentRepository.findByCourseId(courseId);
        Course course = courseRepository.findById(courseId).orElse(null);
        String courseTitle = course != null ? course.getTitle() : "Unknown";
        String deliveryMode = course != null ? course.getDeliveryMode().name() : null;

        // Batch-fetch stats
        List<UUID> assignmentIds = assignments.stream()
            .map(a -> a.getId().value())
            .collect(Collectors.toList());

        Map<UUID, Long> submissionCounts = statsQuery.countSubmissionsByAssignmentIds(assignmentIds);
        Map<UUID, Long> gradedCounts = statsQuery.countGradedByAssignmentIds(assignmentIds);
        Map<UUID, Double> avgGrades = statsQuery.avgGradeByAssignmentIds(assignmentIds);
        Map<UUID, Long> enrollmentCounts = statsQuery.countEnrolledStudentsByCourseIds(List.of(courseId));
        int totalStudents = enrollmentCounts.getOrDefault(courseId, 0L).intValue();

        return assignments.stream()
                .map(a -> {
                    UUID aId = a.getId().value();
                    int submissions = submissionCounts.getOrDefault(aId, 0L).intValue();
                    int graded = gradedCounts.getOrDefault(aId, 0L).intValue();
                    Double avgScore = avgGrades.get(aId);

                    return AssignmentDTOs.AssignmentSummary.builder()
                            .id(aId.toString())
                            .title(a.getTitle())
                            .description(a.getDescription())
                            .dueDate(a.getDueDate() != null ? a.getDueDate().toString() : null)
                            .courseId(a.getCourseId() != null ? a.getCourseId().toString() : null)
                            .courseTitle(courseTitle)
                            .deliveryMode(deliveryMode)
                            .status(a.getStatus() != null ? a.getStatus().name() : "DRAFT")
                            .submissionsCount(submissions)
                            .totalStudents(totalStudents)
                            .gradedCount(graded)
                            .pendingCount(Math.max(0, submissions - graded))
                            .averageScore(avgScore)
                            .createdAt(a.getCreatedAt() != null ? a.getCreatedAt().toString() : null)
                            .updatedAt(a.getUpdatedAt() != null ? a.getUpdatedAt().toString() : null)
                            .build();
                })
                .collect(Collectors.toList());
    }
}

package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.application.dto.AssignmentDTOs;
import com.example.lms.assessment.application.port.AssignmentStatsQueryPort;
import com.example.lms.assessment.domain.model.Assignment;
import com.example.lms.assessment.domain.repository.AssignmentRepository;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GetTeacherAssignmentsSummaryUseCase {

    private final AssignmentRepository assignmentRepository;
    private final CourseRepository courseRepository;
    private final AssignmentStatsQueryPort statsQuery;

    @Transactional(readOnly = true)
    public List<AssignmentDTOs.AssignmentSummary> execute(UUID teacherId) {
        var coursesPage = courseRepository.findByTeacherId(teacherId, Pageable.ofSize(1000));
        var courses = coursesPage.getContent();
        var courseIds = courses.stream().map(Course::getId).collect(Collectors.toList());

        if (courseIds.isEmpty()) {
            return List.of();
        }

        var assignments = assignmentRepository.findByCourseIdIn(courseIds);

        Map<UUID, String> courseTitleMap = courses.stream()
            .collect(Collectors.toMap(Course::getId, Course::getTitle));
        Map<UUID, String> courseDeliveryModeMap = courses.stream()
            .collect(Collectors.toMap(Course::getId, c -> c.getDeliveryMode().name()));

        // Batch-fetch stats for all assignments in one go
        List<UUID> assignmentIds = assignments.stream()
            .map(a -> a.getId().value())
            .collect(Collectors.toList());

        Map<UUID, Long> submissionCounts = statsQuery.countSubmissionsByAssignmentIds(assignmentIds);
        Map<UUID, Long> gradedCounts = statsQuery.countGradedByAssignmentIds(assignmentIds);
        Map<UUID, Double> avgGrades = statsQuery.avgGradeByAssignmentIds(assignmentIds);
        Map<UUID, Long> enrollmentCounts = statsQuery.countEnrolledStudentsByCourseIds(courseIds);

        return assignments.stream()
            .map(a -> mapToSummary(a, courseTitleMap, courseDeliveryModeMap, submissionCounts, gradedCounts, avgGrades, enrollmentCounts))
            .collect(Collectors.toList());
    }

    private AssignmentDTOs.AssignmentSummary mapToSummary(
            Assignment assignment,
            Map<UUID, String> courseTitleMap,
            Map<UUID, String> courseDeliveryModeMap,
            Map<UUID, Long> submissionCounts,
            Map<UUID, Long> gradedCounts,
            Map<UUID, Double> avgGrades,
            Map<UUID, Long> enrollmentCounts) {

        UUID assignmentId = assignment.getId().value();
        UUID courseId = assignment.getCourseId();

        int submissions = submissionCounts.getOrDefault(assignmentId, 0L).intValue();
        int graded = gradedCounts.getOrDefault(assignmentId, 0L).intValue();
        int totalStudents = courseId != null ? enrollmentCounts.getOrDefault(courseId, 0L).intValue() : 0;
        Double avgScore = avgGrades.get(assignmentId);

        return AssignmentDTOs.AssignmentSummary.builder()
                .id(assignmentId.toString())
                .title(assignment.getTitle())
                .description(assignment.getDescription())
                .dueDate(assignment.getDueDate() != null ? assignment.getDueDate().toString() : null)
                .courseId(courseId != null ? courseId.toString() : null)
                .courseTitle(courseId != null ? courseTitleMap.getOrDefault(courseId, "Unknown") : "Unknown")
                .deliveryMode(courseId != null ? courseDeliveryModeMap.getOrDefault(courseId, "SELF_PACED") : null)
                .status(assignment.getStatus() != null ? assignment.getStatus().name() : "DRAFT")
                .submissionsCount(submissions)
                .totalStudents(totalStudents)
                .gradedCount(graded)
                .pendingCount(Math.max(0, submissions - graded))
                .averageScore(avgScore)
                .createdAt(assignment.getCreatedAt() != null ? assignment.getCreatedAt().toString() : null)
                .updatedAt(assignment.getUpdatedAt() != null ? assignment.getUpdatedAt().toString() : null)
                .build();
    }
}

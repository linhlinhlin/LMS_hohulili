package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.application.dto.AssignmentDTOs;
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

        return assignments.stream()
            .map(a -> mapToSummary(a, courseTitleMap))
            .collect(Collectors.toList());
    }

    private AssignmentDTOs.AssignmentSummary mapToSummary(Assignment assignment, Map<UUID, String> courseTitleMap) {
        return AssignmentDTOs.AssignmentSummary.builder()
                .id(assignment.getId().value().toString())
                .title(assignment.getTitle())
                .description(assignment.getDescription())
                .dueDate(assignment.getDueDate() != null ? assignment.getDueDate().toString() : null)
                .courseId(assignment.getCourseId() != null ? assignment.getCourseId().toString() : null)
                .courseTitle("Unknown Course")
                .status(assignment.getStatus() != null ? assignment.getStatus().name() : "DRAFT")
                .submissionsCount(0)
                .totalStudents(0)
                .createdAt(assignment.getCreatedAt() != null ? assignment.getCreatedAt().toString() : null)
                .updatedAt(assignment.getUpdatedAt() != null ? assignment.getUpdatedAt().toString() : null)
                .build();
    }
}

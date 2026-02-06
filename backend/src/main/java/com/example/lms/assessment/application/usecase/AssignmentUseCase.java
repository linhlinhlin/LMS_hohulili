package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.application.dto.AssignmentDTOs;
import com.example.lms.assessment.domain.model.Assignment;
import com.example.lms.assessment.domain.repository.AssignmentRepository;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
public class AssignmentUseCase {

    private final AssignmentRepository assignmentRepository;
    private final CourseRepository courseRepository;

    @Transactional(readOnly = true)
    public List<AssignmentDTOs.AssignmentSummary> getTeacherAssignmentsSummary(UUID teacherId) {
        var coursesPage = courseRepository.findByTeacherId(teacherId, Pageable.ofSize(1000));
        var courses = coursesPage.getContent();
        var courseIds = courses.stream().map(Course::getId).collect(Collectors.toList());

        if (courseIds.isEmpty()) {
            return new ArrayList<>();
        }

        var assignments = assignmentRepository.findByCourseIdIn(courseIds);

        Map<UUID, String> courseTitleMap = courses.stream()
            .collect(Collectors.toMap(Course::getId, Course::getTitle));

        return assignments.stream().map(a -> mapToSummary(a, courseTitleMap)).collect(Collectors.toList());
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

    @Transactional(readOnly = true)
    public List<AssignmentDTOs.AssignmentSummary> getAssignmentsByCourse(UUID courseId) {
        var assignments = assignmentRepository.findByCourseId(courseId);
        String courseTitle = courseRepository.findById(courseId)
                 .map(Course::getTitle)
                 .orElse("Unknown");

        Map<UUID, String> courseTitleMap = Map.of(courseId, courseTitle);

        return assignments.stream()
                .map(a -> mapToSummary(a, courseTitleMap))
                .collect(Collectors.toList());
    }
}

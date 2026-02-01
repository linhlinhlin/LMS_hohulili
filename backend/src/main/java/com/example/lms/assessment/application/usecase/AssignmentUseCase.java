package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.application.dto.AssignmentDTOs;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentJpaRepository;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository; // Importing Authoring Repo directly as shortcut
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

    private final AssignmentJpaRepository assignmentRepository;
    private final JpaCourseRepository courseRepository;

    @Transactional(readOnly = true)
    public List<AssignmentDTOs.AssignmentSummary> getTeacherAssignmentsSummary(UUID teacherId) {
        // 1. Find all courses by teacher
        // Using unpaged to get all? Or reasonable limit?
        // findByTeacherId returns Page. We need all IDs.
        // Assuming custom method or using Pageable.unpaged() if supported, or large page.
        // Step 466: findByTeacherId(UUID, Pageable).
        
        // Hack: fetch large page.
        var coursesPage = courseRepository.findByTeacherId(teacherId, Pageable.ofSize(1000));
        var courses = coursesPage.getContent();
        var courseIds = courses.stream().map(Course::getId).collect(Collectors.toList());
        
        if (courseIds.isEmpty()) {
            return new ArrayList<>();
        }
        
        // 2. Find assignments
        var assignments = assignmentRepository.findByCourseIdIn(courseIds);
        
        // 3. Map
        Map<UUID, String> courseTitleMap = courses.stream()
            .collect(Collectors.toMap(Course::getId, Course::getTitle));

        return assignments.stream().map(a -> mapToSummary(a, courseTitleMap)).collect(Collectors.toList());
    }

    private AssignmentDTOs.AssignmentSummary mapToSummary(AssignmentJpaEntity entity, Map<UUID, String> courseTitleMap) {
        return AssignmentDTOs.AssignmentSummary.builder()
                .id(entity.getId().toString())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .dueDate(entity.getDueDate() != null ? entity.getDueDate().toString() : null)
                .courseId(entity.getCourseId().toString())
                .courseTitle(courseTitleMap.getOrDefault(entity.getCourseId(), "Unknown Course"))
                .status(entity.getStatus() != null ? entity.getStatus().name() : "DRAFT")
                .submissionsCount(0) // TODO: Aggregate submissions
                .totalStudents(0) // TODO: Aggregate enrolled students
                .createdAt(entity.getCreatedAt() != null ? entity.getCreatedAt().toString() : null)
                .updatedAt(entity.getUpdatedAt() != null ? entity.getUpdatedAt().toString() : null)
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

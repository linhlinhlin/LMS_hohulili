package com.example.lms.assessment.infrastructure.persistence;

import com.example.lms.assessment.application.port.StudentAssessmentAccessPort;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentAllocationJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentAllocationStudentJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.QuizAssignmentJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.QuizJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentAllocationJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentAllocationStudentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizAssignmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizJpaRepositoryV3;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.EnrollmentJpaEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class StudentAssessmentAccessAdapter implements StudentAssessmentAccessPort {

    private final AssignmentJpaRepository assignmentRepository;
    private final AssignmentAllocationJpaRepository allocationRepository;
    private final AssignmentAllocationStudentJpaRepository allocationStudentRepository;
    private final QuizAssignmentJpaRepository quizAssignmentJpaRepository;
    private final QuizJpaRepositoryV3 quizJpaRepository;
    private final JpaEnrollmentRepository enrollmentRepository;
    private final JpaCourseRepository courseRepository;

    @Override
    public boolean canAccessAssignment(UUID assignmentId, UUID studentId) {
        AssignmentJpaEntity assignment = assignmentRepository.findById(assignmentId).orElse(null);
        if (assignment == null || assignment.getStatus() != AssignmentJpaEntity.AssignmentStatus.PUBLISHED) {
            return false;
        }

        StudentEnrollmentContext context = loadEnrollmentContext(studentId);
        if (!context.isEnrolledInCourse(assignment.getCourseId())) {
            return false;
        }

        return isAssignmentVisible(
                assignmentId,
                context,
                Map.of(assignmentId, allocationRepository.findByAssignmentId(assignmentId))
        );
    }

    @Override
    public List<UUID> filterAccessibleAssignmentIds(List<UUID> assignmentIds, UUID studentId) {
        if (assignmentIds == null || assignmentIds.isEmpty()) {
            return List.of();
        }

        StudentEnrollmentContext context = loadEnrollmentContext(studentId);
        if (context.courseIds().isEmpty()) {
            return List.of();
        }

        Map<UUID, AssignmentJpaEntity> assignmentsById = assignmentRepository.findAllById(assignmentIds).stream()
                .filter(assignment -> assignment.getStatus() == AssignmentJpaEntity.AssignmentStatus.PUBLISHED)
                .collect(Collectors.toMap(AssignmentJpaEntity::getId, assignment -> assignment));

        Map<UUID, List<AssignmentAllocationJpaEntity>> allocationsByAssignment = loadAllocationsByAssignment(assignmentsById.keySet());

        return assignmentIds.stream()
                .map(assignmentsById::get)
                .filter(assignment -> assignment != null && context.isEnrolledInCourse(assignment.getCourseId()))
                .filter(assignment -> isAssignmentVisible(assignment.getId(), context, allocationsByAssignment))
                .map(AssignmentJpaEntity::getId)
                .toList();
    }

    @Override
    public boolean canAccessQuiz(UUID quizId, UUID studentId) {
        QuizJpaEntity quiz = quizJpaRepository.findById(quizId).orElse(null);
        if (quiz == null) {
            return false;
        }

        StudentEnrollmentContext context = loadEnrollmentContext(studentId);
        if (context.courseIds().isEmpty()) {
            return false;
        }

        Optional<QuizAssignmentJpaEntity> assignment = quizAssignmentJpaRepository.findFirstByQuizIdOrderByAssignedAtDesc(quizId);
        if (assignment.isPresent()) {
            QuizAssignmentJpaEntity quizAssignment = assignment.get();
            if (Boolean.FALSE.equals(quizAssignment.getIsActive())) {
                return false;
            }
            if (quizAssignment.getClassId() != null) {
                return context.isEnrolledInClass(quizAssignment.getClassId());
            }
            if (quizAssignment.getCourseId() != null) {
                return context.isEnrolledInCourse(quizAssignment.getCourseId());
            }
        }

        return courseRepository.findByLessonId(quiz.getLessonId())
                .map(course -> context.isEnrolledInCourse(course.getId()))
                .orElse(false);
    }

    private boolean isAssignmentVisible(
            UUID assignmentId,
            StudentEnrollmentContext context,
            Map<UUID, List<AssignmentAllocationJpaEntity>> allocationsByAssignment) {
        List<AssignmentAllocationJpaEntity> activeAllocations = allocationsByAssignment
                .getOrDefault(assignmentId, List.of())
                .stream()
                .filter(allocation -> !Boolean.FALSE.equals(allocation.getIsActive()))
                .toList();

        if (activeAllocations.isEmpty()) {
            return true;
        }

        Map<UUID, Set<UUID>> allocationStudents = loadAllocationStudents(activeAllocations);
        return activeAllocations.stream().anyMatch(allocation ->
                switch (normalizeDistributionType(allocation.getDistributionType())) {
                    case "CLASS" -> allocation.getClassId() != null && context.isEnrolledInClass(allocation.getClassId());
                    case "SPECIFIC_STUDENTS" -> allocationStudents
                            .getOrDefault(allocation.getId(), Set.of())
                            .contains(context.studentId());
                    default -> true;
                });
    }

    private Map<UUID, List<AssignmentAllocationJpaEntity>> loadAllocationsByAssignment(Collection<UUID> assignmentIds) {
        if (assignmentIds == null || assignmentIds.isEmpty()) {
            return Map.of();
        }
        return allocationRepository.findByAssignmentIdIn(assignmentIds).stream()
                .collect(Collectors.groupingBy(AssignmentAllocationJpaEntity::getAssignmentId));
    }

    private Map<UUID, Set<UUID>> loadAllocationStudents(List<AssignmentAllocationJpaEntity> allocations) {
        if (allocations == null || allocations.isEmpty()) {
            return Map.of();
        }

        List<UUID> allocationIds = allocations.stream()
                .filter(allocation -> "SPECIFIC_STUDENTS".equals(normalizeDistributionType(allocation.getDistributionType())))
                .map(AssignmentAllocationJpaEntity::getId)
                .toList();

        if (allocationIds.isEmpty()) {
            return Map.of();
        }

        Map<UUID, Set<UUID>> result = new HashMap<>();
        for (AssignmentAllocationStudentJpaEntity entity : allocationStudentRepository.findByAllocationIdIn(allocationIds)) {
            result.computeIfAbsent(entity.getAllocationId(), ignored -> new HashSet<>()).add(entity.getStudentId());
        }
        return result;
    }

    private StudentEnrollmentContext loadEnrollmentContext(UUID studentId) {
        List<EnrollmentJpaEntity> enrollments = enrollmentRepository.findActiveAndCompletedWithClass(studentId);
        Set<UUID> courseIds = new HashSet<>();
        Set<UUID> classIds = new HashSet<>();

        for (EnrollmentJpaEntity enrollment : enrollments) {
            if (enrollment.getLearningClass() == null) {
                continue;
            }
            classIds.add(enrollment.getLearningClass().getId());
            if (enrollment.getLearningClass().getCourseId() != null) {
                courseIds.add(enrollment.getLearningClass().getCourseId());
            }
        }

        return new StudentEnrollmentContext(studentId, courseIds, classIds);
    }

    private String normalizeDistributionType(String distributionType) {
        if (distributionType == null || distributionType.isBlank()) {
            return "ALL_STUDENTS";
        }
        return distributionType.trim().toUpperCase();
    }

    private record StudentEnrollmentContext(UUID studentId, Set<UUID> courseIds, Set<UUID> classIds) {
        private boolean isEnrolledInCourse(UUID courseId) {
            return courseId != null && courseIds.contains(courseId);
        }

        private boolean isEnrolledInClass(UUID classId) {
            return classId != null && classIds.contains(classId);
        }
    }
}

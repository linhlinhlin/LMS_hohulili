package com.example.lms.assessment.infrastructure.persistence;

import com.example.lms.assessment.application.port.StudentAssignmentQueryPort;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentAllocationJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentSubmissionJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentAllocationJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentSubmissionJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaLearningClassRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.EnrollmentJpaEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Infrastructure adapter implementing StudentAssignmentQueryPort.
 * Delegates to JPA repositories (legitimate infrastructure dependency).
 */
@Component
@RequiredArgsConstructor
public class StudentAssignmentQueryAdapter implements StudentAssignmentQueryPort {

    private final JpaEnrollmentRepository enrollmentRepository;
    private final AssignmentJpaRepository assignmentRepository;
    private final AssignmentAllocationJpaRepository allocationRepository;
    private final AssignmentSubmissionJpaRepository submissionRepository;
    private final JpaCourseRepository courseRepository;
    private final JpaLearningClassRepository classRepository;

    @Override
    public List<EnrolledCourse> findActiveEnrolledCourses(UUID studentId) {
        List<EnrollmentJpaEntity> enrollments = enrollmentRepository.findActiveAndCompletedWithClass(studentId);
        return enrollments.stream()
                .filter(e -> e.getLearningClass() != null && e.getLearningClass().getCourseId() != null)
                .map(e -> new EnrolledCourse(e.getLearningClass().getCourseId()))
                .distinct()
                .collect(Collectors.toList());
    }

    @Override
    public List<AssignmentSummary> findPublishedAssignmentsByCourseIds(List<UUID> courseIds) {
        List<AssignmentJpaEntity> assignments = assignmentRepository.findByCourseIdInAndStatus(
                courseIds, AssignmentJpaEntity.AssignmentStatus.PUBLISHED);
        if (assignments.isEmpty()) {
            return List.of();
        }

        Map<UUID, CourseJpaEntity> coursesById = courseRepository.findAllById(courseIds).stream()
                .collect(Collectors.toMap(CourseJpaEntity::getId, Function.identity()));

        Map<UUID, AssignmentAllocationJpaEntity> allocationsByAssignmentId = allocationRepository.findByAssignmentIdIn(
                        assignments.stream().map(AssignmentJpaEntity::getId).toList())
                .stream()
                .filter(allocation -> Boolean.TRUE.equals(allocation.getIsActive()))
                .collect(Collectors.toMap(
                        AssignmentAllocationJpaEntity::getAssignmentId,
                        Function.identity(),
                        (existing, replacement) -> existing));

        Set<UUID> classIds = allocationsByAssignmentId.values().stream()
                .map(AssignmentAllocationJpaEntity::getClassId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<UUID, String> classNamesById = classRepository.findAllById(classIds).stream()
                .collect(Collectors.toMap(com.example.lms.learning_delivery.infrastructure.persistence.entity.LearningClassJpaEntity::getId,
                        com.example.lms.learning_delivery.infrastructure.persistence.entity.LearningClassJpaEntity::getName));

        return assignments.stream()
                .map(a -> {
                    CourseJpaEntity course = coursesById.get(a.getCourseId());
                    AssignmentAllocationJpaEntity allocation = allocationsByAssignmentId.get(a.getId());
                    String distributionType = allocation != null && allocation.getDistributionType() != null && !allocation.getDistributionType().isBlank()
                            ? allocation.getDistributionType()
                            : "ALL_STUDENTS";
                    UUID classId = allocation != null ? allocation.getClassId() : null;

                    return new AssignmentSummary(
                            a.getId(), a.getTitle(), a.getDescription(), a.getInstructions(),
                            a.getCourseId(),
                            course != null ? course.getTitle() : null,
                            course != null && course.getDeliveryMode() != null ? course.getDeliveryMode().name() : null,
                            a.getDueDate(),
                            a.getMaxScore() != null ? a.getMaxScore().doubleValue() : null,
                            a.getAllowLateSubmission(), a.getMaxAttempts(),
                            distributionType,
                            classId,
                            classId != null ? classNamesById.get(classId) : null);
                })
                .collect(Collectors.toList());
    }

    @Override
    public Map<UUID, SubmissionInfo> findLatestSubmissionsByStudent(UUID studentId) {
        List<AssignmentSubmissionJpaEntity> submissions = submissionRepository.findByStudentId(studentId);
        return submissions.stream()
                .collect(Collectors.toMap(
                        AssignmentSubmissionJpaEntity::getAssignmentId,
                        this::toSubmissionInfo,
                        (a, b) -> a));
    }

    @Override
    public Optional<AssignmentDetail> findAssignmentById(UUID assignmentId) {
        return assignmentRepository.findById(assignmentId)
                .map(a -> {
                    CourseJpaEntity course = a.getCourseId() != null
                            ? courseRepository.findById(a.getCourseId()).orElse(null)
                            : null;
                    AssignmentAllocationJpaEntity allocation = allocationRepository.findByAssignmentId(a.getId()).stream()
                            .filter(item -> Boolean.TRUE.equals(item.getIsActive()))
                            .findFirst()
                            .orElse(null);
                    UUID classId = allocation != null ? allocation.getClassId() : null;
                    String className = classId != null
                            ? classRepository.findById(classId).map(com.example.lms.learning_delivery.infrastructure.persistence.entity.LearningClassJpaEntity::getName).orElse(null)
                            : null;
                    String distributionType = allocation != null && allocation.getDistributionType() != null && !allocation.getDistributionType().isBlank()
                            ? allocation.getDistributionType()
                            : "ALL_STUDENTS";

                    return new AssignmentDetail(
                            a.getId(), a.getTitle(), a.getDescription(), a.getInstructions(),
                            a.getCourseId(),
                            course != null ? course.getTitle() : null,
                            course != null && course.getDeliveryMode() != null ? course.getDeliveryMode().name() : null,
                            a.getDueDate(),
                            a.getMaxScore() != null ? a.getMaxScore().doubleValue() : null,
                            a.getAllowLateSubmission(), a.getMaxAttempts(),
                            distributionType,
                            classId,
                            className);
                });
    }

    @Override
    public Optional<SubmissionInfo> findSubmission(UUID assignmentId, UUID studentId) {
        return submissionRepository.findByAssignmentIdAndStudentId(assignmentId, studentId)
                .map(this::toSubmissionInfo);
    }

    @Override
    public Optional<String> findCourseTitle(UUID courseId) {
        return courseRepository.findById(courseId).map(CourseJpaEntity::getTitle);
    }

    private SubmissionInfo toSubmissionInfo(AssignmentSubmissionJpaEntity s) {
        return new SubmissionInfo(
                s.getId(), s.getAssignmentId(), s.getSubmittedAt(),
                s.getGrade(), s.getFeedback(), s.getGradedAt(),
                s.getFileUrl(), s.getFileName(), s.getContent(),
                s.getStatus().name());
    }
}

package com.example.lms.assessment.infrastructure.persistence;

import com.example.lms.assessment.application.port.StudentAssignmentQueryPort;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentSubmissionJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentSubmissionJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
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
    private final AssignmentSubmissionJpaRepository submissionRepository;
    private final JpaCourseRepository courseRepository;

    @Override
    public List<EnrolledCourse> findActiveEnrolledCourses(UUID studentId) {
        List<EnrollmentJpaEntity> enrollments = enrollmentRepository.findActiveWithClass(studentId);
        return enrollments.stream()
                .map(e -> new EnrolledCourse(e.getLearningClass().getCourseId()))
                .distinct()
                .collect(Collectors.toList());
    }

    @Override
    public List<AssignmentSummary> findPublishedAssignmentsByCourseIds(List<UUID> courseIds) {
        List<AssignmentJpaEntity> assignments = assignmentRepository.findByCourseIdInAndStatus(
                courseIds, AssignmentJpaEntity.AssignmentStatus.PUBLISHED);
        return assignments.stream()
                .map(a -> new AssignmentSummary(
                        a.getId(), a.getTitle(), a.getDescription(), a.getInstructions(),
                        a.getCourseId(), a.getDueDate(),
                        a.getMaxScore() != null ? a.getMaxScore().doubleValue() : null,
                        a.getAllowLateSubmission(), a.getMaxAttempts()))
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
                .map(a -> new AssignmentDetail(
                        a.getId(), a.getTitle(), a.getDescription(), a.getInstructions(),
                        a.getCourseId(), a.getDueDate(),
                        a.getMaxScore() != null ? a.getMaxScore().doubleValue() : null,
                        a.getAllowLateSubmission(), a.getMaxAttempts()));
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

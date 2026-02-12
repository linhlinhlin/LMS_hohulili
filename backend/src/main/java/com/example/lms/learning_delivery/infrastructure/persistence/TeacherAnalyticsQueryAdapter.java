package com.example.lms.learning_delivery.infrastructure.persistence;

import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentSubmissionJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CourseReviewJpaRepository;
import com.example.lms.learning_delivery.application.port.TeacherAnalyticsQueryPort;
import com.example.lms.shared.infrastructure.persistence.repository.PaymentTransactionJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class TeacherAnalyticsQueryAdapter implements TeacherAnalyticsQueryPort {

    private final JpaCourseRepository courseRepository;
    private final JpaEnrollmentRepository enrollmentRepository;
    private final AssignmentJpaRepository assignmentRepository;
    private final AssignmentSubmissionJpaRepository submissionRepository;
    private final PaymentTransactionJpaRepository paymentRepository;
    private final CourseReviewJpaRepository reviewRepository;

    @Override
    public List<CourseProjection> findCoursesByTeacherId(UUID teacherId) {
        return courseRepository.findByTeacherId(teacherId, PageRequest.of(0, 1000))
                .getContent().stream()
                .map(c -> new CourseProjection(c.getId(), c.getTitle(), c.getStatus().name()))
                .collect(Collectors.toList());
    }

    @Override
    public long countDistinctStudentsByCourseIds(List<UUID> courseIds) {
        return enrollmentRepository.countDistinctStudentsByCourseIds(courseIds);
    }

    @Override
    public BigDecimal sumRevenueByCourseIds(List<UUID> courseIds) {
        return paymentRepository.sumRevenueByCourseIds(courseIds);
    }

    @Override
    public Double getAverageRatingByCourseId(UUID courseId) {
        return reviewRepository.getAverageRatingByCourseId(courseId);
    }

    @Override
    public long countReviewsByCourseId(UUID courseId) {
        return reviewRepository.countByCourseId(courseId);
    }

    @Override
    public List<UUID> findAssignmentIdsByCourseIds(List<UUID> courseIds) {
        return assignmentRepository.findByCourseIdIn(courseIds).stream()
                .map(AssignmentJpaEntity::getId)
                .collect(Collectors.toList());
    }

    @Override
    public long countPendingSubmissionsByAssignmentIds(List<UUID> assignmentIds) {
        return submissionRepository.countPendingByAssignmentIds(assignmentIds);
    }

    @Override
    public Map<UUID, Long> countEnrollmentsByCourseIds(List<UUID> courseIds) {
        Map<UUID, Long> result = new HashMap<>();
        List<Object[]> enrollmentCounts = enrollmentRepository.countEnrollmentsByCourseIds(courseIds);
        for (Object[] row : enrollmentCounts) {
            UUID courseId = (UUID) row[0];
            Long count = (Long) row[1];
            result.put(courseId, count);
        }
        return result;
    }
}

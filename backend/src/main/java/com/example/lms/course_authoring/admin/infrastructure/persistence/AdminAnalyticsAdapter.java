package com.example.lms.course_authoring.admin.infrastructure.persistence;

import com.example.lms.course_authoring.admin.application.port.AdminAnalyticsPort;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.shared.infrastructure.persistence.repository.PaymentTransactionJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Infrastructure adapter wiring {@link AdminAnalyticsPort} to existing JPA
 * repositories. Aggregates spans modules (identity / course_authoring /
 * learning_delivery / payments) which is acceptable here because the admin
 * dashboard is intentionally a cross-cutting view.
 */
@Component
@RequiredArgsConstructor
public class AdminAnalyticsAdapter implements AdminAnalyticsPort {

    private final UserJpaRepository userRepository;
    private final JpaCourseRepository courseRepository;
    private final JpaEnrollmentRepository enrollmentRepository;
    private final PaymentTransactionJpaRepository paymentRepository;

    @Override
    public long countAllUsers() {
        return userRepository.count();
    }

    @Override
    public long countAllCourses() {
        return courseRepository.count();
    }

    @Override
    public long countAllEnrollments() {
        return enrollmentRepository.count();
    }

    @Override
    public long countUsersCreatedBetween(Instant from, Instant to) {
        return userRepository.countByCreatedAtBetween(from, to);
    }

    @Override
    public long countCoursesCreatedBetween(Instant from, Instant to) {
        return courseRepository.countByCreatedAtBetween(from, to);
    }

    @Override
    public BigDecimal sumRevenueBetween(Instant from, Instant to) {
        BigDecimal sum = paymentRepository.sumRevenueByDateRange(from, to);
        return sum != null ? sum : BigDecimal.ZERO;
    }

    @Override
    public long countUsersByOrganization(UUID organizationId) {
        if (organizationId == null) return 0L;
        return userRepository.countByOrganizationId(organizationId);
    }

    @Override
    public long countCoursesByOrganization(UUID organizationId) {
        if (organizationId == null) return 0L;
        return courseRepository.countByOrganizationId(organizationId);
    }

    @Override
    public long countEnrollmentsByCourseIds(List<UUID> courseIds) {
        if (courseIds == null || courseIds.isEmpty()) return 0L;
        return enrollmentRepository.countTotalByCourseIds(courseIds);
    }

    @Override
    public long countUsersCreatedBetweenInOrganization(UUID organizationId, Instant from, Instant to) {
        if (organizationId == null) return 0L;
        return userRepository.countByOrganizationIdAndCreatedAtBetween(organizationId, from, to);
    }

    @Override
    public long countCoursesCreatedBetweenInOrganization(UUID organizationId, Instant from, Instant to) {
        if (organizationId == null) return 0L;
        return courseRepository.countByOrganizationIdAndCreatedAtBetween(organizationId, from, to);
    }

    @Override
    public BigDecimal sumRevenueBetweenInOrganization(UUID organizationId, Instant from, Instant to) {
        if (organizationId == null) return BigDecimal.ZERO;
        BigDecimal sum = paymentRepository.sumRevenueByOrganizationIdAndDateRange(organizationId, from, to);
        return sum != null ? sum : BigDecimal.ZERO;
    }

    @Override
    public List<UUID> findCourseIdsByOrganization(UUID organizationId) {
        if (organizationId == null) return List.of();
        return courseRepository.findCourseIdsByOrganizationId(organizationId);
    }
}

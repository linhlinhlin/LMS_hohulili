package com.example.lms.course_authoring.admin.application.port;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Aggregation port for admin analytics queries.
 *
 * <p>All "Between" methods use a half-open interval {@code [from, to)} so two
 * adjacent windows do not double-count the boundary instant.
 */
public interface AdminAnalyticsPort {

    // === System-wide totals (cumulative) ===

    long countAllUsers();

    long countAllCourses();

    long countAllEnrollments();

    // === System-wide windowed counts ===

    long countUsersCreatedBetween(Instant from, Instant to);

    long countCoursesCreatedBetween(Instant from, Instant to);

    BigDecimal sumRevenueBetween(Instant from, Instant to);

    // === Org-scoped totals (cumulative) ===

    long countUsersByOrganization(UUID organizationId);

    long countCoursesByOrganization(UUID organizationId);

    long countEnrollmentsByCourseIds(List<UUID> courseIds);

    // === Org-scoped windowed counts ===

    long countUsersCreatedBetweenInOrganization(UUID organizationId, Instant from, Instant to);

    long countCoursesCreatedBetweenInOrganization(UUID organizationId, Instant from, Instant to);

    BigDecimal sumRevenueBetweenInOrganization(UUID organizationId, Instant from, Instant to);

    // === Org helpers ===

    /** Resolve course IDs owned directly by the given organization. */
    List<UUID> findCourseIdsByOrganization(UUID organizationId);
}

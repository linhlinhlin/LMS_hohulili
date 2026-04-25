package com.example.lms.course_authoring.admin.application.port;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Set;
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

    long countCoursesByTeacherIds(Set<UUID> teacherIds);

    long countEnrollmentsByCourseIds(List<UUID> courseIds);

    // === Org-scoped windowed counts ===

    long countUsersCreatedBetweenInOrganization(UUID organizationId, Instant from, Instant to);

    long countCoursesCreatedBetweenByTeacherIds(Set<UUID> teacherIds, Instant from, Instant to);

    BigDecimal sumRevenueBetweenByCourseIds(List<UUID> courseIds, Instant from, Instant to);

    // === Org helpers ===

    /** Resolve teacher IDs that belong to the given organization. */
    Set<UUID> findTeacherIdsByOrganization(UUID organizationId);

    /** Resolve course IDs owned by any teacher in the given set. */
    List<UUID> findCourseIdsByTeacherIds(Set<UUID> teacherIds);
}

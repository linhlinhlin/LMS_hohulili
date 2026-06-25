package com.example.lms.course_authoring.admin.application.usecase;

import com.example.lms.course_authoring.admin.application.dto.GrowthMetric;
import com.example.lms.course_authoring.admin.application.dto.WindowedAnalyticsResponse;
import com.example.lms.course_authoring.admin.application.port.AdminAnalyticsPort;
import com.example.lms.shared.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Computes admin dashboard analytics for a sliding window of {@code days} days,
 * compared against the immediately preceding window of the same length. Backs
 * the F-08 date-range toggle (epic #157).
 *
 * <p>Window semantics: {@code [now - days, now)} for the current window,
 * {@code [now - 2*days, now - days)} for the prior window. Half-open intervals
 * mean adjacent windows do not double-count the boundary instant.
 *
 * <p>When {@code organizationId} is non-null the use case scopes every count to
 * users, courses, and payments owned by that organization. When it is null the
 * counts are system-wide.
 */
@Component
@RequiredArgsConstructor
public class GetWindowedAnalyticsUseCase {

    private static final Set<Integer> ALLOWED_DAYS = Set.of(7, 30, 90);

    private final AdminAnalyticsPort analyticsPort;
    private final Clock clock;

    public WindowedAnalyticsResponse execute(int days, UUID organizationId) {
        validateDays(days);

        Instant windowEnd = Instant.now(clock);
        Instant windowStart = windowEnd.minus(days, ChronoUnit.DAYS);
        Instant prevWindowStart = windowStart.minus(days, ChronoUnit.DAYS);

        return organizationId != null
                ? buildOrgScoped(days, organizationId, windowStart, windowEnd, prevWindowStart)
                : buildSystemWide(days, windowStart, windowEnd, prevWindowStart);
    }

    private void validateDays(int days) {
        if (!ALLOWED_DAYS.contains(days)) {
            throw new ValidationException(
                    "days",
                    "Tham số 'days' chỉ chấp nhận 7, 30 hoặc 90 (đã nhận: " + days + ")"
            );
        }
    }

    private WindowedAnalyticsResponse buildSystemWide(
            int days, Instant windowStart, Instant windowEnd, Instant prevWindowStart
    ) {
        long totalUsers = analyticsPort.countAllUsers();
        long totalCourses = analyticsPort.countAllCourses();
        long totalEnrollments = analyticsPort.countAllEnrollments();

        long usersThis = analyticsPort.countUsersCreatedBetween(windowStart, windowEnd);
        long usersLast = analyticsPort.countUsersCreatedBetween(prevWindowStart, windowStart);
        long coursesThis = analyticsPort.countCoursesCreatedBetween(windowStart, windowEnd);
        long coursesLast = analyticsPort.countCoursesCreatedBetween(prevWindowStart, windowStart);

        BigDecimal revenueThis = analyticsPort.sumRevenueBetween(windowStart, windowEnd);
        BigDecimal revenueLast = analyticsPort.sumRevenueBetween(prevWindowStart, windowStart);

        return assemble(
                days, windowStart, windowEnd,
                totalUsers, totalCourses, totalEnrollments,
                usersThis, usersLast,
                coursesThis, coursesLast,
                revenueThis, revenueLast
        );
    }

    private WindowedAnalyticsResponse buildOrgScoped(
            int days, UUID organizationId, Instant windowStart, Instant windowEnd, Instant prevWindowStart
    ) {
        List<UUID> courseIds = analyticsPort.findCourseIdsByOrganization(organizationId);

        long totalUsers = analyticsPort.countUsersByOrganization(organizationId);
        long totalCourses = analyticsPort.countCoursesByOrganization(organizationId);
        long totalEnrollments = analyticsPort.countEnrollmentsByCourseIds(courseIds);

        long usersThis = analyticsPort.countUsersCreatedBetweenInOrganization(organizationId, windowStart, windowEnd);
        long usersLast = analyticsPort.countUsersCreatedBetweenInOrganization(organizationId, prevWindowStart, windowStart);
        long coursesThis = analyticsPort.countCoursesCreatedBetweenInOrganization(organizationId, windowStart, windowEnd);
        long coursesLast = analyticsPort.countCoursesCreatedBetweenInOrganization(organizationId, prevWindowStart, windowStart);

        BigDecimal revenueThis = analyticsPort.sumRevenueBetweenInOrganization(organizationId, windowStart, windowEnd);
        BigDecimal revenueLast = analyticsPort.sumRevenueBetweenInOrganization(organizationId, prevWindowStart, windowStart);

        return assemble(
                days, windowStart, windowEnd,
                totalUsers, totalCourses, totalEnrollments,
                usersThis, usersLast,
                coursesThis, coursesLast,
                revenueThis, revenueLast
        );
    }

    private WindowedAnalyticsResponse assemble(
            int days, Instant windowStart, Instant windowEnd,
            long totalUsers, long totalCourses, long totalEnrollments,
            long usersThis, long usersLast,
            long coursesThis, long coursesLast,
            BigDecimal revenueThis, BigDecimal revenueLast
    ) {
        double revenue = revenueThis.setScale(2, RoundingMode.HALF_UP).doubleValue();
        return new WindowedAnalyticsResponse(
                days,
                totalUsers,
                totalCourses,
                totalEnrollments,
                revenue,
                GrowthMetric.of(usersThis, usersLast),
                computeRevenueGrowth(revenueThis, revenueLast),
                GrowthMetric.of(coursesThis, coursesLast),
                windowStart,
                windowEnd
        );
    }

    private Double computeRevenueGrowth(BigDecimal revenueThis, BigDecimal revenueLast) {
        if (revenueLast == null || revenueLast.signum() == 0) {
            return revenueThis != null && revenueThis.signum() > 0 ? null : 0.0;
        }
        BigDecimal delta = revenueThis.subtract(revenueLast);
        BigDecimal rate = delta.divide(revenueLast, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
        return rate.setScale(1, RoundingMode.HALF_UP).doubleValue();
    }
}

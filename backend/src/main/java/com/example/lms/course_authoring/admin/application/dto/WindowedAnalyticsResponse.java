package com.example.lms.course_authoring.admin.application.dto;

import java.time.Instant;

/**
 * Windowed analytics payload for the admin dashboard date-range toggle (F-08).
 *
 * <p>The {@code total*} fields are cumulative counts at {@link #windowEnd}; the
 * {@link GrowthMetric} fields compare new entities created within
 * {@code [windowStart, windowEnd)} against the immediately preceding window of
 * the same length. {@code revenue} is the revenue earned within the current
 * window, {@code revenueGrowth} is the percentage change vs. the prior window.
 */
public record WindowedAnalyticsResponse(
        int windowDays,
        long totalUsers,
        long totalCourses,
        long totalEnrollments,
        double revenue,
        GrowthMetric userGrowth,
        Double revenueGrowth,
        GrowthMetric courseGrowth,
        Instant windowStart,
        Instant windowEnd
) {}

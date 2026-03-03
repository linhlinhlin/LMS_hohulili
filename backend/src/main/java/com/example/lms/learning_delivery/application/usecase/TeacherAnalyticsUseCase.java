package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.learning_delivery.application.port.TeacherAnalyticsQueryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TeacherAnalyticsUseCase {

    private final TeacherAnalyticsQueryPort analyticsQuery;

    public TeacherAnalyticsResponse getAnalytics(UUID teacherId) {
        // Get teacher's courses
        List<TeacherAnalyticsQueryPort.CourseProjection> courses = analyticsQuery.findCoursesByTeacherId(teacherId);
        List<UUID> courseIds = courses.stream().map(TeacherAnalyticsQueryPort.CourseProjection::id).collect(Collectors.toList());

        long totalCourses = courses.size();
        long activeCourses = courses.stream()
                .filter(c -> "APPROVED".equals(c.status()))
                .count();

        // Students count
        long totalStudents = 0;
        if (!courseIds.isEmpty()) {
            totalStudents = analyticsQuery.countDistinctStudentsByCourseIds(courseIds);
        }

        // Revenue
        double totalRevenue = 0.0;
        if (!courseIds.isEmpty()) {
            BigDecimal revenue = analyticsQuery.sumRevenueByCourseIds(courseIds);
            totalRevenue = revenue != null ? revenue.doubleValue() : 0.0;
        }

        // Weighted average rating across all courses (Udemy/Coursera pattern)
        // SUM(all_ratings) / COUNT(all_ratings) — weighted by review count per course
        double averageRating = 0.0;
        if (!courseIds.isEmpty()) {
            Double weighted = analyticsQuery.getWeightedAverageRatingByCourseIds(courseIds);
            if (weighted != null) {
                averageRating = Math.round(weighted * 10.0) / 10.0;
            }
        }

        // Pending grading
        long pendingGrading = 0;
        if (!courseIds.isEmpty()) {
            List<UUID> assignmentIds = analyticsQuery.findAssignmentIdsByCourseIds(courseIds);
            if (!assignmentIds.isEmpty()) {
                pendingGrading = analyticsQuery.countPendingSubmissionsByAssignmentIds(assignmentIds);
            }
        }

        // Enrollment counts per course
        Map<UUID, Long> enrollmentMap = new HashMap<>();
        if (!courseIds.isEmpty()) {
            enrollmentMap = analyticsQuery.countEnrollmentsByCourseIds(courseIds);
        }

        // Build course performance list
        List<CoursePerformanceItem> coursePerformance = new ArrayList<>();
        for (var course : courses) {
            Double rating = analyticsQuery.getAverageRatingByCourseId(course.id());
            long reviewCount = analyticsQuery.countReviewsByCourseId(course.id());
            long enrolled = enrollmentMap.getOrDefault(course.id(), 0L);

            coursePerformance.add(new CoursePerformanceItem(
                    course.id().toString(),
                    course.title(),
                    enrolled,
                    rating != null ? Math.round(rating * 10.0) / 10.0 : 0.0,
                    reviewCount
            ));
        }

        return new TeacherAnalyticsResponse(
                totalCourses,
                activeCourses,
                totalStudents,
                totalRevenue,
                averageRating,
                pendingGrading,
                coursePerformance
        );
    }

    // Response DTOs
    public record TeacherAnalyticsResponse(
            long totalCourses,
            long activeCourses,
            long totalStudents,
            double totalRevenue,
            double averageRating,
            long pendingGrading,
            List<CoursePerformanceItem> coursePerformance
    ) {}

    public record CoursePerformanceItem(
            String courseId,
            String courseTitle,
            long enrolledStudents,
            double averageRating,
            long reviewCount
    ) {}
}

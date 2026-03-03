# Teacher KPI Rating Bugs — Design

**Date**: 2026-03-02
**Status**: Approved

## Problem

Teacher dashboard KPI cards have 2 rating bugs:

### Bug 1 (P1): Per-course rating always 0.0
- `CourseAuthoringUseCase.mapToTeacherCourseResponse()` hardcodes `averageRating(0.0)`
- `TeacherCoursesControllerV3.getMyCourses()` batch-enriches enrollment/chapter/lesson counts but **skips rating**
- Result: teacher course cards never show star rating badge (template checks `course.rating > 0`)

### Bug 2 (P2): Analytics averageRating not weighted
- `TeacherAnalyticsUseCase` loops per-course, gets `AVG(rating)` for each, then calculates `mean(course_averages)`
- A course with 1 review has same weight as a course with 100 reviews
- SOTA (Udemy, Coursera): weighted average = `SUM(all_ratings) / COUNT(all_ratings)`

## Fixes

### Fix 1: Batch rating enrichment in getMyCourses()
- Add `getAverageRatingsByCourseIds(List<UUID>)` batch query to `CourseReviewJpaRepository`
- Inject `CourseReviewJpaRepository` into `TeacherCoursesControllerV3`
- Enrich `averageRating` field alongside existing enrollment/chapter/lesson enrichment

### Fix 2: Weighted average in analytics
- Add `getWeightedAverageRatingByCourseIds(List<UUID>)` to `CourseReviewJpaRepository`
- Add `getWeightedAverageRatingByCourseIds()` to `TeacherAnalyticsQueryPort`
- Implement in `TeacherAnalyticsQueryAdapter`
- Replace per-course loop in `TeacherAnalyticsUseCase` with single weighted query

## Files Modified

| File | Change |
|------|--------|
| `CourseReviewJpaRepository.java` | +2 batch JPQL queries |
| `TeacherCoursesControllerV3.java` | +inject ReviewRepo, +rating enrichment |
| `TeacherAnalyticsQueryPort.java` | +weighted rating method signature |
| `TeacherAnalyticsQueryAdapter.java` | +implement weighted rating |
| `TeacherAnalyticsUseCase.java` | Replace loop with single weighted query |

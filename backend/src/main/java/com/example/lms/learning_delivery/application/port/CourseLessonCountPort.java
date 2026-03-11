package com.example.lms.learning_delivery.application.port;

import java.util.UUID;

/**
 * Port for querying total lesson count in a course.
 * Used by UpdateLessonProgressUseCase to calculate completion percentage
 * without violating Clean Architecture (no direct JPA dependency in application layer).
 */
public interface CourseLessonCountPort {
    /**
     * Count total lessons in a course across all chapters.
     * Returns 0 if course has no chapters or no lessons.
     */
    int countLessonsInCourse(UUID courseId);
}

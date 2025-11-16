package com.example.lms.service;

import com.example.lms.entity.*;
import com.example.lms.repository.StudentLessonProgressRepository;
import com.example.lms.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Domain Service: Lesson Progress Management
 *
 * Contains business logic for lesson progress tracking.
 * Ensures domain invariants and coordinates progress-related operations.
 *
 * Domain Rules:
 * - Student must be enrolled in course to track progress
 * - Progress can only advance (NOT_STARTED -> IN_PROGRESS -> COMPLETED)
 * - Completion triggers course progress recalculation
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class LessonProgressDomainService {

    private final StudentLessonProgressRepository progressRepository;
    private final CourseRepository courseRepository;

    /**
     * Mark a lesson as completed for a student
     *
     * Business Rules:
     * 1. Student must be enrolled in the course
     * 2. Lesson must exist and be accessible
     * 3. Progress status must advance correctly
     * 4. Completion timestamp is recorded
     */
    @Transactional
    public StudentLessonProgress completeLesson(User student, Lesson lesson) {
        log.info("Completing lesson {} for student {}", lesson.getId(), student.getId());

        // Validate student is enrolled in course
        Course course = lesson.getSection().getCourse();
        validateStudentEnrollment(student, course);

        // Find or create progress record
        StudentLessonProgress progress = progressRepository
                .findByStudentAndLesson(student, lesson)
                .orElseGet(() -> createInitialProgress(student, lesson));

        // Mark as completed (domain behavior)
        progress.markAsCompleted();

        // Explicitly save progress with transaction
        StudentLessonProgress savedProgress = progressRepository.saveAndFlush(progress);

        log.info("Lesson {} marked as completed for student {}. Progress saved with ID: {}",
                lesson.getId(), student.getId(), savedProgress.getId());
        return savedProgress;
    }

    /**
     * Start progress on a lesson
     */
    @Transactional
    public StudentLessonProgress startLesson(User student, Lesson lesson) {
        log.debug("Starting lesson {} for student {}", lesson.getId(), student.getId());

        // Validate enrollment
        Course course = lesson.getSection().getCourse();
        validateStudentEnrollment(student, course);

        // Find or create progress
        StudentLessonProgress progress = progressRepository
                .findByStudentAndLesson(student, lesson)
                .orElseGet(() -> createInitialProgress(student, lesson));

        // Start progress
        progress.startProgress();

        return progressRepository.saveAndFlush(progress);
    }

    /**
     * Get progress for a specific lesson
     */
    public Optional<StudentLessonProgress> getLessonProgress(User student, Lesson lesson) {
        return progressRepository.findByStudentAndLesson(student, lesson);
    }

    /**
     * Calculate course progress for a student
     */
    public CourseProgress calculateCourseProgress(User student, Course course) {
        log.debug("Calculating course progress for student {} in course {}", student.getId(), course.getId());

        // Get all progress records for this student and course
        List<StudentLessonProgress> progressList = progressRepository
                .findByStudentAndCourse(student, course);

        // Count total lessons in course
        long totalLessons = progressRepository.countTotalLessonsByCourse(course);

        // Count completed lessons
        long completedLessons = progressList.stream()
                .filter(p -> p.getStatus() == StudentLessonProgress.ProgressStatus.COMPLETED)
                .count();

        // Calculate percentage
        BigDecimal progressPercentage = BigDecimal.ZERO;
        if (totalLessons > 0) {
            progressPercentage = BigDecimal.valueOf(completedLessons)
                    .divide(BigDecimal.valueOf(totalLessons), 2, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
        }

        return CourseProgress.builder()
                .courseId(course.getId())
                .studentId(student.getId())
                .totalLessons((int) totalLessons)
                .completedLessons((int) completedLessons)
                .progressPercentage(progressPercentage)
                .isCompleted(completedLessons == totalLessons && totalLessons > 0)
                .build();
    }

    /**
     * Get detailed progress for all lessons in a course
     */
    public List<StudentLessonProgress> getCourseLessonProgress(User student, Course course) {
        return progressRepository.findByStudentAndCourse(student, course);
    }

    /**
     * Initialize progress for all lessons when student enrolls in course
     * This is optional - progress can be created lazily on first access
     */
    public void initializeCourseProgress(User student, Course course) {
        log.info("Initializing progress tracking for student {} in course {}", student.getId(), course.getId());

        // Get all lessons in course
        List<Lesson> lessons = course.getSections().stream()
                .flatMap(section -> section.getLessons().stream())
                .toList();

        // Create progress records for lessons that don't have them
        for (Lesson lesson : lessons) {
            if (!progressRepository.existsByStudentAndLesson(student, lesson)) {
                StudentLessonProgress progress = createInitialProgress(student, lesson);
                progressRepository.save(progress);
            }
        }
    }

    /**
     * Check if student has access to lesson (enrolled and lesson exists)
     */
    public boolean hasAccessToLesson(User student, Lesson lesson) {
        Course course = lesson.getSection().getCourse();
        return course.getEnrolledStudents().contains(student);
    }

    // Private helper methods

    private void validateStudentEnrollment(User student, Course course) {
        // Use database query instead of lazy collection to avoid N+1 queries and lazy loading issues
        boolean isEnrolled = courseRepository.existsByEnrolledStudentAndCourse(student.getId(), course.getId());
        if (!isEnrolled) {
            throw new IllegalStateException(
                String.format("Student %s is not enrolled in course %s", student.getId(), course.getId())
            );
        }
    }

    private StudentLessonProgress createInitialProgress(User student, Lesson lesson) {
        return StudentLessonProgress.builder()
                .student(student)
                .lesson(lesson)
                .status(StudentLessonProgress.ProgressStatus.NOT_STARTED)
                .build();
    }

    // DTO for course progress calculation
    public static class CourseProgress {
        private UUID courseId;
        private UUID studentId;
        private int totalLessons;
        private int completedLessons;
        private BigDecimal progressPercentage;
        private boolean isCompleted;

        public static CourseProgressBuilder builder() {
            return new CourseProgressBuilder();
        }

        public static class CourseProgressBuilder {
            private UUID courseId;
            private UUID studentId;
            private int totalLessons;
            private int completedLessons;
            private BigDecimal progressPercentage;
            private boolean isCompleted;

            public CourseProgressBuilder courseId(UUID courseId) { this.courseId = courseId; return this; }
            public CourseProgressBuilder studentId(UUID studentId) { this.studentId = studentId; return this; }
            public CourseProgressBuilder totalLessons(int totalLessons) { this.totalLessons = totalLessons; return this; }
            public CourseProgressBuilder completedLessons(int completedLessons) { this.completedLessons = completedLessons; return this; }
            public CourseProgressBuilder progressPercentage(BigDecimal progressPercentage) { this.progressPercentage = progressPercentage; return this; }
            public CourseProgressBuilder isCompleted(boolean isCompleted) { this.isCompleted = isCompleted; return this; }

            public CourseProgress build() {
                CourseProgress progress = new CourseProgress();
                progress.courseId = this.courseId;
                progress.studentId = this.studentId;
                progress.totalLessons = this.totalLessons;
                progress.completedLessons = this.completedLessons;
                progress.progressPercentage = this.progressPercentage;
                progress.isCompleted = this.isCompleted;
                return progress;
            }
        }

        // Getters
        public UUID getCourseId() { return courseId; }
        public UUID getStudentId() { return studentId; }
        public int getTotalLessons() { return totalLessons; }
        public int getCompletedLessons() { return completedLessons; }
        public BigDecimal getProgressPercentage() { return progressPercentage; }
        public boolean isCompleted() { return isCompleted; }
    }
}
package com.example.lms.service;

import com.example.lms.entity.Course;
import com.example.lms.entity.Lesson;
import com.example.lms.entity.Section;
import com.example.lms.entity.User;
import com.example.lms.repository.CourseRepository;
import com.example.lms.repository.StudentLessonProgressRepository;
import com.example.lms.repository.SubmissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

/**
 * Teacher Domain Service - Pure business logic following DDD principles
 * No infrastructure dependencies, only domain logic
 */
@Service
@RequiredArgsConstructor
public class TeacherDomainService {
    
    private final StudentLessonProgressRepository progressRepository;
    private final SubmissionRepository submissionRepository;
    private final CourseRepository courseRepository;
    
    /**
     * Calculate student's progress in a specific course
     * 
     * @param student The student user
     * @param course The course
     * @return Progress object with completed/total lessons and percentage
     */
    public Progress calculateStudentProgress(User student, Course course) {
        int totalLessons = countTotalLessons(course);
        int completedLessons = countCompletedLessons(student, course);
        
        double percentage = totalLessons > 0 
            ? (double) completedLessons / totalLessons * 100.0
            : 0.0;
        
        return new Progress(completedLessons, totalLessons, percentage);
    }
    
    /**
     * Calculate average grade for student across teacher's courses
     * 
     * @param student The student user
     * @param courses List of teacher's courses
     * @return Average grade (0-10 scale)
     */
    public double calculateAverageGrade(User student, List<Course> courses) {
        List<UUID> courseIds = courses.stream()
            .map(Course::getId)
            .toList();
        
        if (courseIds.isEmpty()) {
            return 0.0;
        }
        
        Double average = submissionRepository.calculateAverageScoreByStudentAndCourses(
            student.getId(), courseIds
        );
        
        return average != null ? average : 0.0;
    }
    
    /**
     * Verify that teacher has access to student
     * Business rule: Teacher can only access students enrolled in their courses
     * 
     * @param teacherId Teacher's UUID
     * @param studentId Student's UUID
     * @throws AccessDeniedException if teacher doesn't have access
     */
    public void verifyTeacherStudentAccess(UUID teacherId, UUID studentId) {
        boolean hasAccess = courseRepository.existsStudentInTeacherCourses(teacherId, studentId);
        
        if (!hasAccess) {
            throw new AccessDeniedException(
                "Teacher does not have access to this student. " +
                "Student is not enrolled in any of your courses."
            );
        }
    }
    
    /**
     * Count total lessons in a course
     */
    private int countTotalLessons(Course course) {
        return course.getSections().stream()
            .mapToInt(section -> section.getLessons() != null ? section.getLessons().size() : 0)
            .sum();
    }
    
    /**
     * Count completed lessons for student in course
     */
    private int countCompletedLessons(User student, Course course) {
        return progressRepository.countCompletedLessonsByCourse(
            student.getId(), 
            course.getId()
        );
    }
    
    /**
     * Value object for Progress
     */
    public static class Progress {
        private final int completedLessons;
        private final int totalLessons;
        private final double percentage;
        
        public Progress(int completedLessons, int totalLessons, double percentage) {
            if (completedLessons < 0 || totalLessons < 0) {
                throw new IllegalArgumentException("Lesson counts cannot be negative");
            }
            if (completedLessons > totalLessons) {
                throw new IllegalArgumentException("Completed lessons cannot exceed total lessons");
            }
            
            this.completedLessons = completedLessons;
            this.totalLessons = totalLessons;
            this.percentage = BigDecimal.valueOf(percentage)
                .setScale(1, RoundingMode.HALF_UP)
                .doubleValue();
        }
        
        public int getCompletedLessons() {
            return completedLessons;
        }
        
        public int getTotalLessons() {
            return totalLessons;
        }
        
        public double getPercentage() {
            return percentage;
        }
        
        public int getPercentageAsInt() {
            return (int) Math.round(percentage);
        }
        
        public boolean isComplete() {
            return completedLessons == totalLessons && totalLessons > 0;
        }
        
        public static Progress zero() {
            return new Progress(0, 0, 0.0);
        }
    }
    
    /**
     * Custom exception for access denied
     */
    public static class AccessDeniedException extends RuntimeException {
        public AccessDeniedException(String message) {
            super(message);
        }
    }
}

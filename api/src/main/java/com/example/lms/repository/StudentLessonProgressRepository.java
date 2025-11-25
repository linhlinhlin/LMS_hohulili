package com.example.lms.repository;

import com.example.lms.entity.StudentLessonProgress;
import com.example.lms.entity.User;
import com.example.lms.entity.Lesson;
import com.example.lms.entity.Course;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for Student Lesson Progress
 *
 * Provides data access methods for lesson progress tracking.
 * Includes custom queries for progress calculations and reporting.
 */
@Repository
public interface StudentLessonProgressRepository extends JpaRepository<StudentLessonProgress, UUID> {

    /**
     * Find progress for a specific student and lesson
     */
    Optional<StudentLessonProgress> findByStudentAndLesson(User student, Lesson lesson);

    /**
     * Check if progress exists for student and lesson
     */
    boolean existsByStudentAndLesson(User student, Lesson lesson);

    /**
     * Find all progress for a student in a specific course
     */
    @Query("SELECT p FROM StudentLessonProgress p " +
           "JOIN p.lesson l " +
           "JOIN l.section s " +
           "WHERE p.student = :student AND s.course = :course")
    List<StudentLessonProgress> findByStudentAndCourse(@Param("student") User student, @Param("course") Course course);

    /**
     * Find all progress for a student in a specific course with pagination
     */
    @Query("SELECT p FROM StudentLessonProgress p " +
           "JOIN p.lesson l " +
           "JOIN l.section s " +
           "WHERE p.student = :student AND s.course = :course")
    Page<StudentLessonProgress> findByStudentAndCourse(@Param("student") User student, @Param("course") Course course, Pageable pageable);

    /**
     * Count completed lessons for a student in a course
     */
    @Query("SELECT COUNT(p) FROM StudentLessonProgress p " +
           "JOIN p.lesson l " +
           "JOIN l.section s " +
           "WHERE p.student = :student AND s.course = :course AND p.status = 'COMPLETED'")
    long countCompletedLessonsByStudentAndCourse(@Param("student") User student, @Param("course") Course course);

    /**
     * Count total lessons in a course
     */
    @Query("SELECT COUNT(l) FROM Lesson l " +
           "JOIN l.section s " +
           "WHERE s.course = :course")
    long countTotalLessonsByCourse(@Param("course") Course course);

    /**
     * Find completed lessons for a student in a course
     */
    @Query("SELECT p FROM StudentLessonProgress p " +
           "JOIN p.lesson l " +
           "JOIN l.section s " +
           "WHERE p.student = :student AND s.course = :course AND p.status = 'COMPLETED'")
    List<StudentLessonProgress> findCompletedLessonsByStudentAndCourse(@Param("student") User student, @Param("course") Course course);

    /**
     * Find in-progress lessons for a student
     */
    @Query("SELECT p FROM StudentLessonProgress p " +
           "WHERE p.student = :student AND p.status = 'IN_PROGRESS'")
    List<StudentLessonProgress> findInProgressLessonsByStudent(@Param("student") User student);

    /**
     * Find recently completed lessons for a student
     */
    @Query("SELECT p FROM StudentLessonProgress p " +
           "WHERE p.student = :student AND p.status = 'COMPLETED' " +
           "ORDER BY p.completedAt DESC")
    Page<StudentLessonProgress> findRecentlyCompletedLessonsByStudent(@Param("student") User student, Pageable pageable);

    /**
     * Get progress statistics for a course
     */
    @Query("SELECT " +
           "COUNT(DISTINCT CASE WHEN p.status = 'COMPLETED' THEN p.student END) as completedStudents, " +
           "COUNT(DISTINCT p.student) as totalStudents, " +
           "AVG(CASE WHEN p.status = 'COMPLETED' THEN 1.0 ELSE 0.0 END) as avgCompletionRate " +
           "FROM StudentLessonProgress p " +
           "JOIN p.lesson l " +
           "JOIN l.section s " +
           "WHERE s.course = :course")
    Object[] getCourseProgressStatistics(@Param("course") Course course);

    /**
     * Bulk operations for initialization
     */
    @Query("SELECT p FROM StudentLessonProgress p WHERE p.student.id = :studentId")
    List<StudentLessonProgress> findByStudentId(@Param("studentId") UUID studentId);

    /**
     * Find progress by lesson IDs for bulk operations
     */
    @Query("SELECT p FROM StudentLessonProgress p WHERE p.lesson.id IN :lessonIds AND p.student = :student")
    List<StudentLessonProgress> findByLessonIdsAndStudent(@Param("lessonIds") List<UUID> lessonIds, @Param("student") User student);
    
    /**
     * Count completed lessons for student in a course (by IDs)
     */
    @Query("SELECT COUNT(p) FROM StudentLessonProgress p " +
           "JOIN p.lesson l " +
           "JOIN l.section s " +
           "WHERE p.student.id = :studentId " +
           "AND s.course.id = :courseId " +
           "AND p.status = 'COMPLETED'")
    int countCompletedLessonsByCourse(
        @Param("studentId") UUID studentId, 
        @Param("courseId") UUID courseId
    );
    
    /**
     * Batch query: Get progress summary for multiple students in teacher's courses
     * Returns: studentId, courseId, completedLessons, totalLessons
     */
    @Query(value = """
        SELECT 
            u.id as student_id,
            c.id as course_id,
            COUNT(CASE WHEN slp.status = 'COMPLETED' THEN 1 END) as completed_lessons,
            COUNT(l.id) as total_lessons,
            MAX(slp.last_accessed) as last_accessed
        FROM users u
        JOIN course_enrollments ce ON ce.student_id = u.id
        JOIN courses c ON c.id = ce.course_id
        JOIN sections s ON s.course_id = c.id
        JOIN lessons l ON l.section_id = s.id
        LEFT JOIN student_lesson_progress slp ON slp.student_id = u.id AND slp.lesson_id = l.id
        WHERE c.teacher_id = :teacherId
        AND (:courseId IS NULL OR c.id = :courseId)
        AND u.id IN :studentIds
        GROUP BY u.id, c.id
    """, nativeQuery = true)
    List<Object[]> getProgressSummaryForStudents(
        @Param("teacherId") UUID teacherId,
        @Param("courseId") UUID courseId,
        @Param("studentIds") List<UUID> studentIds
    );
    
    /**
     * Get enrollment info with last accessed for students
     */
    @Query(value = """
        SELECT 
            ce.student_id,
            ce.course_id,
            ce.enrolled_at,
            ce.last_accessed as enrollment_last_accessed,
            ce.status as enrollment_status
        FROM course_enrollments ce
        WHERE ce.student_id IN :studentIds
        AND (:courseId IS NULL OR ce.course_id = :courseId)
    """, nativeQuery = true)
    List<Object[]> getEnrollmentInfo(
        @Param("studentIds") List<UUID> studentIds,
        @Param("courseId") UUID courseId
    );
}
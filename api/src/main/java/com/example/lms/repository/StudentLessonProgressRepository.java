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
}
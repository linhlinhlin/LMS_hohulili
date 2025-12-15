package com.example.lms.repository;

import com.example.lms.entity.Quiz;
import com.example.lms.entity.Lesson;
import com.example.lms.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface QuizRepository extends JpaRepository<Quiz, UUID> {

    @Query("SELECT q FROM Quiz q WHERE q.section.lesson.id = :lessonId")
    Optional<Quiz> findByLessonId(@Param("lessonId") UUID lessonId);

    Optional<Quiz> findBySectionId(UUID sectionId);

    // Find first quiz by lesson id to handle potential duplicates
    @Query("SELECT q FROM Quiz q WHERE q.section.lesson.id = :lessonId ORDER BY q.createdAt DESC")
    Optional<Quiz> findFirstByLessonIdOrderByCreatedAtDesc(@Param("lessonId") UUID lessonId);

    // Find all quizzes by lesson id (for debugging)
    @Query("SELECT q FROM Quiz q WHERE q.section.lesson.id = :lessonId")
    List<Quiz> findAllByLessonId(@Param("lessonId") UUID lessonId);

    // NEW: Check if lesson already has a quiz
    @Query("SELECT COUNT(q) > 0 FROM Quiz q WHERE q.section.lesson = :lesson")
    boolean existsByLesson(@Param("lesson") Lesson lesson);

    // NEW: Find all quizzes by course (for ASSIGNMENT type)
    List<Quiz> findByCourse(Course course);

    // NEW: Find quizzes by type
    List<Quiz> findByType(Quiz.QuizType type);

    // NEW: Find quizzes by course and type
    List<Quiz> findByCourseAndType(Course course, Quiz.QuizType type);

    // Find all quizzes for a course via lesson's section -> lesson -> chapter -> course
    @Query("SELECT q FROM Quiz q " +
           "JOIN q.section s " +
           "JOIN s.lesson l " +
           "JOIN l.chapter c " +
           "JOIN c.course co " +
           "WHERE co.id = :courseId")
    List<Quiz> findByCourseId(@Param("courseId") UUID courseId);

    // Find all quizzes created by an instructor
    @Query("SELECT q FROM Quiz q " +
           "JOIN q.section s " +
           "JOIN s.lesson l " +
           "JOIN l.chapter c " +
           "JOIN c.course co " +
           "WHERE co.teacher.id = :instructorId")
    List<Quiz> findByInstructorId(@Param("instructorId") UUID instructorId);
}
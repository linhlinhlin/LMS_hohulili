package com.example.lms.repository;

import com.example.lms.entity.Quiz;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface QuizRepository extends JpaRepository<Quiz, UUID> {

    Optional<Quiz> findByLessonId(UUID lessonId);

    // Find first quiz by lesson id to handle potential duplicates
    Optional<Quiz> findFirstByLessonIdOrderByCreatedAtDesc(UUID lessonId);

    // Find all quizzes by lesson id (for debugging)
    List<Quiz> findAllByLessonId(UUID lessonId);

    // Find all quizzes for a course via lesson's section
    @Query("SELECT q FROM Quiz q JOIN q.lesson l JOIN l.section s WHERE s.course.id = :courseId")
    List<Quiz> findByCourseId(@Param("courseId") UUID courseId);

    // Find all quizzes created by an instructor
    @Query("SELECT q FROM Quiz q JOIN q.lesson l JOIN l.section s WHERE s.course.teacher.id = :instructorId")
    List<Quiz> findByInstructorId(@Param("instructorId") UUID instructorId);
}
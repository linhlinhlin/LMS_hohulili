package com.example.lms.repository;

import com.example.lms.entity.Quiz;
import com.example.lms.entity.QuizAssignment;
import com.example.lms.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface QuizAssignmentRepository extends JpaRepository<QuizAssignment, UUID> {

    /**
     * Find assignment by quiz and student
     */
    Optional<QuizAssignment> findByQuizAndStudent(Quiz quiz, User student);

    /**
     * Check if assignment exists for quiz and student
     */
    boolean existsByQuizAndStudent(Quiz quiz, User student);

    /**
     * Find all assignments for a quiz
     */
    List<QuizAssignment> findByQuiz(Quiz quiz);

    /**
     * Find all assignments for a student
     */
    List<QuizAssignment> findByStudent(User student);

    /**
     * Find all assignments for a student with specific status
     */
    List<QuizAssignment> findByStudentAndStatus(User student, QuizAssignment.AssignmentStatus status);
}

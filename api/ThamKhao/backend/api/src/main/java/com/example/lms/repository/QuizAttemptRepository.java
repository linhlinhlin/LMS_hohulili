package com.example.lms.repository;

import com.example.lms.entity.QuizAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, UUID> {

    List<QuizAttempt> findByQuizIdAndStudentId(UUID quizId, UUID studentId);

    Optional<QuizAttempt> findByQuizIdAndStudentIdAndStatus(UUID quizId, UUID studentId, QuizAttempt.Status status);

    @Query("SELECT COUNT(a) FROM QuizAttempt a WHERE a.quiz.id = :quizId AND a.student.id = :studentId AND a.status = 'SUBMITTED'")
    long countSubmittedAttempts(@Param("quizId") UUID quizId, @Param("studentId") UUID studentId);

    List<QuizAttempt> findByQuizIdOrderByCreatedAtDesc(UUID quizId);
}
package com.example.lms.repository;

import com.example.lms.entity.QuizQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface QuizQuestionRepository extends JpaRepository<QuizQuestion, UUID> {

    List<QuizQuestion> findByQuizIdOrderByDisplayOrderAsc(UUID quizId);
    
    Optional<QuizQuestion> findByQuizIdAndQuestionId(UUID quizId, UUID questionId);
    
    long countByQuizId(UUID quizId);
    
    @Query("SELECT MAX(qq.displayOrder) FROM QuizQuestion qq WHERE qq.quiz.id = :quizId")
    Integer findMaxDisplayOrderByQuizId(@Param("quizId") UUID quizId);
    
    @Transactional
    void deleteByQuizIdAndQuestionId(UUID quizId, UUID questionId);
    
    @Transactional
    void deleteByQuizId(UUID quizId);
}
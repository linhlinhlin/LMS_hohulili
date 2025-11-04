package com.example.lms.repository;

import com.example.lms.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface QuestionRepository extends JpaRepository<Question, UUID> {

    List<Question> findByCreatedByIdAndStatus(UUID createdById, Question.Status status);

    List<Question> findByStatus(Question.Status status);

    @Query("SELECT q FROM Question q WHERE q.status = :status AND " +
           "(:difficulty IS NULL OR q.difficulty = :difficulty) AND " +
           "(:tags IS NULL OR q.tags LIKE %:tags%)")
    List<Question> findByFilters(@Param("status") Question.Status status,
                                @Param("difficulty") Question.Difficulty difficulty,
                                @Param("tags") String tags);

    @Query("SELECT q FROM Question q WHERE q.id IN :ids")
    List<Question> findByIds(@Param("ids") List<UUID> ids);
}
package com.example.lms.repository;

import com.example.lms.entity.QuestionOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository for QuestionOption entity with migration support methods
 */
@Repository
public interface QuestionOptionRepository extends JpaRepository<QuestionOption, UUID> {

    /**
     * Find options that don't have content blocks (need migration)
     */
    @Query("SELECT qo FROM QuestionOption qo WHERE qo.contentBlocks IS NULL")
    List<QuestionOption> findByContentBlocksIsNull();

    /**
     * Count options that have content blocks
     */
    @Query("SELECT COUNT(qo) FROM QuestionOption qo WHERE qo.contentBlocks IS NOT NULL")
    long countByContentBlocksIsNotNull();

    /**
     * Count options that don't have content blocks
     */
    @Query("SELECT COUNT(qo) FROM QuestionOption qo WHERE qo.contentBlocks IS NULL")
    long countByContentBlocksIsNull();

    /**
     * Find options by question ID
     */
    List<QuestionOption> findByQuestionId(UUID questionId);

    /**
     * Find options by question ID and option key
     */
    QuestionOption findByQuestionIdAndOptionKey(UUID questionId, String optionKey);
}
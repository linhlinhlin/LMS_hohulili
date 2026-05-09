package com.example.lms.assessment.infrastructure.persistence.repository;

import com.example.lms.assessment.infrastructure.persistence.entity.QuestionJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface QuestionJpaRepository extends JpaRepository<QuestionJpaEntity, UUID> {
    java.util.List<QuestionJpaEntity> findByPackageId(UUID packageId);
    java.util.List<QuestionJpaEntity> findByPackageIdIn(java.util.List<UUID> packageIds);
    java.util.List<QuestionJpaEntity> findAllByCreatedBy(UUID createdBy);
    java.util.List<QuestionJpaEntity> findByPackageIdAndCategoryId(UUID packageId, UUID categoryId);
    long countByPackageId(UUID packageId);
    long countByCategoryId(UUID categoryId);

    @Query(value = "SELECT * FROM questions WHERE package_id = :bankId ORDER BY RANDOM() LIMIT :count",
           nativeQuery = true)
    java.util.List<QuestionJpaEntity> findRandomByBankId(@Param("bankId") UUID bankId, @Param("count") int count);

    java.util.List<QuestionJpaEntity> findByPackageIdAndDifficulty(UUID packageId, String difficulty);

    // Count essay questions per quiz (batch for teacher quiz list)
    @Query(value = "SELECT qq.quiz_id, " +
           "COUNT(CASE WHEN q.question_type = 'ESSAY' THEN 1 END) as essay_count " +
           "FROM quiz_questions qq " +
           "JOIN questions q ON qq.question_id = q.id " +
           "WHERE qq.quiz_id IN :quizIds " +
           "GROUP BY qq.quiz_id", nativeQuery = true)
    java.util.List<Object[]> batchEssayQuestionCount(@Param("quizIds") java.util.List<UUID> quizIds);

    // IMO stats per bank: rows = (imo_course_id nullable, code nullable, title, count)
    @Query(value = """
           SELECT q.imo_course_id, i.code, i.title, COUNT(q.id) as cnt
           FROM questions q
           LEFT JOIN imo_model_courses i ON i.id = q.imo_course_id
           WHERE q.package_id = :bankId
           GROUP BY q.imo_course_id, i.code, i.title
           ORDER BY cnt DESC
           """, nativeQuery = true)
    java.util.List<Object[]> countByImoCourseForBank(@Param("bankId") UUID bankId);
}

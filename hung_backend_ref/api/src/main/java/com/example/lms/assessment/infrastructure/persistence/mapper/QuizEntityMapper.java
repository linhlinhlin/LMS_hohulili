package com.example.lms.assessment.infrastructure.persistence.mapper;

import com.example.lms.assessment.infrastructure.persistence.entity.QuizJpaEntity;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Mapper for Quiz entity.
 */
@Component
public class QuizEntityMapper {

    public QuizJpaEntity toEntity(
            UUID lessonId,
            String title,
            String description,
            Integer timeLimitMinutes,
            Integer maxAttempts,
            Integer passingScore,
            Boolean shuffleQuestions,
            Boolean shuffleOptions,
            Boolean showResultsImmediately,
            Boolean showCorrectAnswers
    ) {
        return QuizJpaEntity.builder()
            .lessonId(lessonId)
            .title(title)
            .description(description)
            .timeLimitMinutes(timeLimitMinutes)
            .maxAttempts(maxAttempts != null ? maxAttempts : 3)
            .passingScore(passingScore != null ? passingScore : 60)
            .shuffleQuestions(shuffleQuestions != null ? shuffleQuestions : false)
            .shuffleOptions(shuffleOptions != null ? shuffleOptions : false)
            .showResultsImmediately(showResultsImmediately != null ? showResultsImmediately : true)
            .showCorrectAnswers(showCorrectAnswers != null ? showCorrectAnswers : true)
            .build();
    }
}

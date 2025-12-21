package com.example.lms.assessment.infrastructure.persistence;

import com.example.lms.assessment.domain.model.Quiz;
import com.example.lms.assessment.domain.model.QuizId;
import com.example.lms.assessment.domain.repository.QuizRepository;
import com.example.lms.assessment.infrastructure.persistence.entity.QuizJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizJpaRepositoryV3;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * JPA implementation of QuizRepository.
 * Adapter that bridges domain model and JPA entity.
 */
@Component
@RequiredArgsConstructor
public class QuizRepositoryAdapter implements QuizRepository {

    private final QuizJpaRepositoryV3 jpaRepository;

    @Override
    public Quiz save(Quiz quiz) {
        QuizJpaEntity entity = toEntity(quiz);
        QuizJpaEntity saved = jpaRepository.save(entity);
        return toDomain(saved);
    }

    @Override
    public Optional<Quiz> findById(QuizId id) {
        return jpaRepository.findById(id.value()).map(this::toDomain);
    }

    @Override
    public List<Quiz> findByLessonId(UUID lessonId) {
        return jpaRepository.findByLessonId(lessonId)
            .stream()
            .map(this::toDomain)
            .collect(Collectors.toList());
    }

    @Override
    public void delete(Quiz quiz) {
        jpaRepository.deleteById(quiz.getId().value());
    }

    @Override
    public boolean existsById(QuizId id) {
        return jpaRepository.existsById(id.value());
    }

    // ============ Mapping Methods ============

    private QuizJpaEntity toEntity(Quiz quiz) {
        return QuizJpaEntity.builder()
            .id(quiz.getId().value())
            .lessonId(quiz.getLessonId())
            .title(quiz.getTitle())
            .description(quiz.getDescription())
            .timeLimitMinutes(quiz.getSettings().timeLimitMinutes())
            .maxAttempts(quiz.getSettings().maxAttempts())
            .passingScore(quiz.getSettings().passingScore())
            .shuffleQuestions(quiz.getSettings().shuffleQuestions())
            .shuffleOptions(quiz.getSettings().shuffleOptions())
            .showResultsImmediately(quiz.getSettings().showResultsImmediately())
            .showCorrectAnswers(quiz.getSettings().showCorrectAnswers())
            .build();
    }

    private Quiz toDomain(QuizJpaEntity entity) {
        Quiz.QuizSettings settings = Quiz.QuizSettings.builder()
            .timeLimitMinutes(entity.getTimeLimitMinutes())
            .maxAttempts(entity.getMaxAttempts())
            .passingScore(entity.getPassingScore())
            .shuffleQuestions(entity.getShuffleQuestions())
            .shuffleOptions(entity.getShuffleOptions())
            .showResultsImmediately(entity.getShowResultsImmediately())
            .showCorrectAnswers(entity.getShowCorrectAnswers())
            .build();

        return Quiz.reconstitute(
            QuizId.of(entity.getId()),
            entity.getLessonId(),
            entity.getTitle(),
            entity.getDescription(),
            settings,
            Quiz.QuizStatus.PUBLISHED, // Default, add status to entity if needed
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }
}

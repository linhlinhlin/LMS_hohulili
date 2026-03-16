package com.example.lms.assessment.infrastructure.persistence;

import com.example.lms.assessment.domain.model.Quiz;
import com.example.lms.assessment.domain.model.QuizId;
import com.example.lms.assessment.domain.model.QuizQuestion;
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
public class QuizRepositoryAdapter implements QuizRepository {

    public QuizRepositoryAdapter(QuizJpaRepositoryV3 jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

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

    @Override
    public boolean isOwnedByTeacher(QuizId quizId, UUID teacherId) {
        return jpaRepository.isOwnedByTeacher(quizId.value(), teacherId);
    }

    // ============ Mapping Methods ============

    private QuizJpaEntity toEntity(Quiz quiz) {
        QuizJpaEntity entity = QuizJpaEntity.builder()
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
            .assessmentType(QuizJpaEntity.AssessmentType.valueOf(quiz.getAssessmentType().name()))
            .countsTowardCertificate(quiz.isCountsTowardCertificate())
            .availableFrom(quiz.getSettings().availableFrom())
            .dueAt(quiz.getSettings().dueAt())
            .lockAt(quiz.getSettings().lockAt())
            .status(QuizJpaEntity.QuizStatus.valueOf(quiz.getStatus().name())) // Map Status
            .build();

        if (quiz.getQuestions() != null) {
            List<com.example.lms.assessment.infrastructure.persistence.entity.QuizQuestionJpaEntity> questionEntities = quiz.getQuestions().stream()
                .map(q -> {
                     var qEntity = com.example.lms.assessment.infrastructure.persistence.entity.QuizQuestionJpaEntity.builder()
                        .quiz(entity) // Bi-directional link
                        .questionId(q.getQuestionId())
                        .displayOrder(q.getDisplayOrder())
                        .points(q.getPoints())
                        .build();
                     return qEntity;
                })
                .collect(Collectors.toList());
            entity.setQuestions(questionEntities);
        }
        
        return entity;
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
            .availableFrom(entity.getAvailableFrom())
            .dueAt(entity.getDueAt())
            .lockAt(entity.getLockAt())
            .build();

        // Build questions list directly via builder (NOT addQuestion which validates isEditable)
        // This is reconstitution from persistence - business rules should not apply
        List<QuizQuestion> questions = new java.util.ArrayList<>();
        if (entity.getQuestions() != null) {
            for (var q : entity.getQuestions()) {
                questions.add(QuizQuestion.builder()
                    .quizId(entity.getId())
                    .questionId(q.getQuestionId())
                    .displayOrder(q.getDisplayOrder())
                    .points(q.getPoints())
                    .build());
            }
        }

        return Quiz.builder()
            .id(QuizId.of(entity.getId()))
            .lessonId(entity.getLessonId())
            .title(entity.getTitle())
            .description(entity.getDescription())
            .settings(settings)
            .assessmentType(Quiz.AssessmentType.valueOf(entity.getAssessmentType().name()))
            .countsTowardCertificate(Boolean.TRUE.equals(entity.getCountsTowardCertificate()))
            .status(Quiz.QuizStatus.valueOf(entity.getStatus().name()))
            .questions(questions)
            .createdAt(entity.getCreatedAt())
            .updatedAt(entity.getUpdatedAt())
            .build();
    }
}

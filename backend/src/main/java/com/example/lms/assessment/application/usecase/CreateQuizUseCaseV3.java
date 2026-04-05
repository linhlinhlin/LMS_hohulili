package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.domain.model.Quiz;
import com.example.lms.assessment.domain.repository.QuizRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Use case for creating a quiz.
 * V3 - Uses pure domain models only.
 * 
 * Clean Architecture: Application layer depends on Domain layer only.
 */
@Service("createQuizUseCaseV3")
@RequiredArgsConstructor
public class CreateQuizUseCaseV3 {

    private static final Logger log = LoggerFactory.getLogger(CreateQuizUseCaseV3.class);

    private final QuizRepository quizRepository;

    public record CreateQuizCommand(
        UUID lessonId,
        String title,
        String description,
        Integer timeLimitMinutes,
        Integer passingScore,
        Double maxScoreScale,
        Boolean shuffleQuestions,
        Boolean showResultsImmediately,
        Quiz.AssessmentType assessmentType,
        Boolean countsTowardCertificate
    ) {}

    @Transactional
    public UUID execute(CreateQuizCommand command) {
        log.info("Creating quiz {} for lesson {} (V3)", command.title(), command.lessonId());

        if (!quizRepository.findByLessonId(command.lessonId()).isEmpty()) {
            throw new IllegalArgumentException("Bai hoc nay da co bai kiem tra");
        }

        // Build quiz settings from command
        Quiz.QuizSettings settings = Quiz.QuizSettings.builder()
            .timeLimitMinutes(command.timeLimitMinutes())
            .passingScore(command.passingScore())
            .maxScoreScale(command.maxScoreScale())
            .shuffleQuestions(command.shuffleQuestions())
            .showResultsImmediately(command.showResultsImmediately())
            .build();

        // Create domain model using factory method
        Quiz quiz = Quiz.create(
            command.lessonId(),
            command.title(),
            command.description(),
            settings
        );

        quiz.updateAssessmentMetadata(
            command.assessmentType() != null ? command.assessmentType() : Quiz.AssessmentType.PRACTICE,
            Boolean.TRUE.equals(command.countsTowardCertificate())
        );

        // Save via repository port
        Quiz saved = quizRepository.save(quiz);
        
        log.info("Quiz {} created with ID {} (V3)", command.title(), saved.getId().value());
        return saved.getId().value();
    }
}

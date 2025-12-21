package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.domain.model.Quiz;
import com.example.lms.assessment.domain.repository.QuizRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
@Slf4j
public class CreateQuizUseCaseV3 {

    private final QuizRepository quizRepository;

    public record CreateQuizCommand(
        UUID lessonId,
        String title,
        String description,
        Integer timeLimitMinutes,
        Integer passingScore,
        Boolean shuffleQuestions,
        Boolean showResultsImmediately
    ) {}

    @Transactional
    public UUID execute(CreateQuizCommand command) {
        log.info("Creating quiz {} for lesson {} (V3)", command.title(), command.lessonId());

        // Build quiz settings from command
        Quiz.QuizSettings settings = Quiz.QuizSettings.builder()
            .timeLimitMinutes(command.timeLimitMinutes())
            .passingScore(command.passingScore())
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

        // Save via repository port
        Quiz saved = quizRepository.save(quiz);
        
        log.info("Quiz {} created with ID {} (V3)", command.title(), saved.getId().value());
        return saved.getId().value();
    }
}


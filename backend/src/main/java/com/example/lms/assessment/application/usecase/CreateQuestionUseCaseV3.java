package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.infrastructure.persistence.entity.QuestionJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.QuestionOptionJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.QuestionJpaRepository;
import com.example.lms.shared.domain.model.ContentBlock;
import lombok.Builder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CreateQuestionUseCaseV3 {

    private final QuestionJpaRepository questionRepository;
    private final com.example.lms.shared.application.service.FileManagementService fileManagementService;

    @Transactional
    public UUID execute(Command command) {
        log.info("Creating new question for package: {}", command.packageId());

        QuestionJpaEntity question = QuestionJpaEntity.builder()
                .contentBlocks(command.contentBlocks())
                .difficulty(command.difficulty())
                .tags(command.tags())
                .status(QuestionJpaEntity.Status.ACTIVE) // Default to ACTIVE
                .correctOption(command.correctOption())
                .createdBy(command.createdBy())
                // .courseId(command.courseId()) // Optional if linked via package
                .packageId(command.packageId())
                .build();

        if (command.options() != null) {
            List<QuestionOptionJpaEntity> options = command.options().stream()
                    .map(opt -> QuestionOptionJpaEntity.builder()
                            .question(question)
                            .contentBlocks(opt.contentBlocks())
                            .isCorrect(opt.isCorrect())
                            .orderIndex(opt.orderIndex())
                            .key(opt.key())
                            .build())
                    .collect(Collectors.toList());
            question.setOptions(options);
        }

        QuestionJpaEntity savedQuestion = questionRepository.save(question);
        
        // SOTA 2026: Hybrid Logic - Link files to entities
        // 1. Link Question Content
        fileManagementService.linkFilesToEntity(command.contentBlocks(), savedQuestion.getId(), "QUESTION");
        
        // 2. Link Options Content
        if (savedQuestion.getOptions() != null) {
            savedQuestion.getOptions().forEach(opt -> {
                fileManagementService.linkFilesToEntity(opt.getContentBlocks(), opt.getId(), "QUESTION_OPTION");
            });
        }
        
        log.info("Question created with ID: {}", savedQuestion.getId());
        return savedQuestion.getId();
    }

    @Builder
    public record Command(
        List<ContentBlock> contentBlocks,
        QuestionJpaEntity.Difficulty difficulty,
        String tags,
        String correctOption,
        UUID createdBy,
        UUID packageId,
        List<OptionCommand> options
    ) {}

    @Builder
    public record OptionCommand(
        List<ContentBlock> contentBlocks,
        boolean isCorrect,
        Integer orderIndex,
        String key
    ) {}
}

package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.domain.model.Question;
import com.example.lms.assessment.domain.model.QuestionBank;
import com.example.lms.assessment.domain.repository.QuestionBankRepository;
import com.example.lms.assessment.domain.repository.QuestionRepository;
import com.example.lms.shared.domain.model.ContentBlock;
import lombok.Builder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Use case for creating questions.
 * Follows Clean Architecture - depends only on domain interfaces.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CreateQuestionUseCaseV3 {

    private final QuestionRepository questionRepository;
    private final QuestionBankRepository questionBankRepository;
    private final com.example.lms.shared.application.port.FileManagementPort fileManagementService;

    @Transactional
    public UUID execute(Command command) {
        log.info("Creating new question for package: {}", command.packageId());

        // Build domain model options
        List<Question.QuestionOption> domainOptions = null;
        if (command.options() != null) {
            domainOptions = command.options().stream()
                    .map(opt -> Question.QuestionOption.create(
                            opt.key(),
                            opt.contentBlocks(),
                            opt.orderIndex() != null ? opt.orderIndex() : 0))
                    .collect(Collectors.toList());
        }

        // Build domain model
        Question question = Question.builder()
                .id(UUID.randomUUID())
                .contentBlocks(command.contentBlocks())
                .difficulty(command.difficulty())
                .tags(command.tags())
                .status(Question.Status.ACTIVE)
                .questionType(command.questionType() != null ? command.questionType() : Question.QuestionType.SINGLE_CHOICE)
                .correctOption(command.correctOption())
                .answerKey(command.answerKey())
                .createdBy(command.createdBy())
                .packageId(command.packageId())
                .categoryId(command.categoryId())
                .options(domainOptions)
                .build();

        // Save via repository (adapter handles JPA conversion)
        Question savedQuestion = questionRepository.save(question);

        // Increment bank question count
        if (command.packageId() != null) {
            questionBankRepository.findById(command.packageId()).ifPresent(bank -> {
                bank.incrementQuestionCount();
                questionBankRepository.save(bank);
            });
        }

        // Link files to entities (SOTA 2026: Hybrid Logic)
        fileManagementService.linkFilesToEntity(command.contentBlocks(), savedQuestion.getId(), "QUESTION");

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
        Question.Difficulty difficulty,
        String tags,
        Question.QuestionType questionType,
        String correctOption,
        Map<String, Object> answerKey,
        UUID createdBy,
        UUID packageId,
        UUID categoryId,
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

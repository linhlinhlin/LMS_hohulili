package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.domain.model.Question;
import com.example.lms.assessment.domain.repository.QuestionRepository;
import com.example.lms.shared.domain.model.ContentBlock;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Use case for updating an existing question.
 * V3 - Uses domain repository and model only.
 */
@Service
@RequiredArgsConstructor
public class UpdateQuestionUseCaseV3 {

    private static final Logger log = LoggerFactory.getLogger(UpdateQuestionUseCaseV3.class);

    private final QuestionRepository questionRepository;

    @Transactional
    public void execute(UUID questionId, Command command) {
        log.info("Updating question {}", questionId);

        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new EntityNotFoundException("Question", questionId));

        question.updateContentBlocks(command.blocks());
        question.updateDifficulty(command.difficulty());
        question.updateTags(command.tags());
        question.updateQuestionType(command.questionType());
        question.updateCorrectOption(command.correctOption());
        question.updateAnswerKey(command.answerKey());
        question.updateStatus(command.status());

        // Update options if provided
        if (command.options() != null && !command.options().isEmpty()) {
            String[] keys = {"A", "B", "C", "D", "E", "F"};

            List<Question.QuestionOption> domainOptions = new java.util.ArrayList<>();
            for (int i = 0; i < command.options().size(); i++) {
                String optText = command.options().get(i);
                String key = (i < keys.length) ? keys[i] : "?";

                Map<String, Object> data = new HashMap<>();
                data.put("text", optText);
                ContentBlock block = ContentBlock.create("text", data);

                Question.QuestionOption option = Question.QuestionOption.create(
                        key, List.of(block), i
                );
                domainOptions.add(option);
            }
            question.replaceOptions(domainOptions);
        }

        questionRepository.save(question);
        log.info("Question {} updated successfully", questionId);
    }

    public record Command(
            List<ContentBlock> blocks,
            String correctOption,
            Map<String, Object> answerKey,
            Question.QuestionType questionType,
            List<String> options,
            Question.Difficulty difficulty,
            String tags,
            Question.Status status
    ) {}
}

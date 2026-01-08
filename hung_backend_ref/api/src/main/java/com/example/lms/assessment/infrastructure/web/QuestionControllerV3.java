package com.example.lms.assessment.infrastructure.web;

import com.example.lms.assessment.application.usecase.CreateQuestionUseCaseV3;
import com.example.lms.assessment.infrastructure.persistence.entity.QuestionJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.QuestionJpaRepository;
import com.example.lms.shared.domain.model.ContentBlock;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v3/questions")
@RequiredArgsConstructor
@Tag(name = "Question V3", description = "Question Management (V3)")
public class QuestionControllerV3 {

    private final CreateQuestionUseCaseV3 createQuestionUseCase;
    private final QuestionJpaRepository questionRepository;

    @GetMapping("/my-questions")
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR', 'ADMIN')")
    @Operation(summary = "Get questions created by current user")
    public ResponseEntity<ApiResponse<List<QuestionJpaEntity>>> getMyQuestions() {
        UUID userId;
        try {
            var authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getPrincipal() instanceof com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity) {
                userId = ((com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity) authentication.getPrincipal()).getId();
            } else {
                throw new RuntimeException("User not found in context");
            }
        } catch (Exception e) {
             throw new RuntimeException("Failed to retrieve authenticated user: " + e.getMessage());
        }

        return ResponseEntity.ok(ApiResponse.success(questionRepository.findAllByCreatedBy(userId)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR', 'ADMIN')")
    @Operation(summary = "Create a new question")
    public ResponseEntity<ApiResponse<UUID>> createQuestion(@RequestBody CreateQuestionRequest request) {
        UUID userId;
        try {
            var authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getPrincipal() instanceof com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity) {
                userId = ((com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity) authentication.getPrincipal()).getId();
            } else {
                // Fallback for simple user details if not Entity
                 // This might fail if principal is just a string, but JwtAuthenticationFilter loads UserJpaEntity
                throw new RuntimeException("User not found in context");
            }
        } catch (Exception e) {
             throw new RuntimeException("Failed to retrieve authenticated user: " + e.getMessage());
        }

        return ResponseEntity.ok(ApiResponse.success(createQuestionUseCase.execute(mapToCommand(request, userId))));
    }

    private CreateQuestionUseCaseV3.Command mapToCommand(CreateQuestionRequest request, UUID userId) {
        List<CreateQuestionUseCaseV3.OptionCommand> optionCommands = new java.util.ArrayList<>();
        String[] keys = {"A", "B", "C", "D", "E", "F"}; // Standard keys
        
        // Use optionBlocks if available (rich text), otherwise use options (plain text)
        if (request.optionBlocks() != null && !request.optionBlocks().isEmpty()) {
            int index = 0;
            for (List<ContentBlock> blocks : request.optionBlocks()) {
                String key = (index < keys.length) ? keys[index] : "?";
                boolean isCorrect = key.equals(request.correctOption());
                
                optionCommands.add(CreateQuestionUseCaseV3.OptionCommand.builder()
                        .contentBlocks(blocks)
                        .isCorrect(isCorrect)
                        .key(key)
                        .orderIndex(index)
                        .build());
                index++;
            }
        } 
        // Fallback or legacy support for simple string options
        else if (request.options() != null) {
             int index = 0;
             for (String optText : request.options()) {
                String key = (index < keys.length) ? keys[index] : "?";
                boolean isCorrect = key.equals(request.correctOption());
                
                // Convert string to simple ContentBlock
                ContentBlock block = new ContentBlock();
                block.setType("text");
                // Simplified data structure for text block if needed, or just standard map
                java.util.Map<String, Object> data = new java.util.HashMap<>();
                data.put("text", optText);
                block.setData(data);
                
                optionCommands.add(CreateQuestionUseCaseV3.OptionCommand.builder()
                        .contentBlocks(List.of(block))
                        .isCorrect(isCorrect)
                        .key(key)
                        .orderIndex(index)
                        .build());
                index++;
             }
        }
        
        return CreateQuestionUseCaseV3.Command.builder()
                .contentBlocks(request.blocks())
                .difficulty(request.difficulty())
                .tags(request.tags())
                .correctOption(request.correctOption())
                .createdBy(userId)
                .packageId(request.packageId())
                .options(optionCommands)
                .build();
    }

    public record CreateQuestionRequest(
            String content, // unused in favor of blocks
            List<ContentBlock> blocks,
            String correctOption,
            List<String> options, // simple text options?
            List<List<ContentBlock>> optionBlocks, // rich text options
            QuestionJpaEntity.Difficulty difficulty,
            String tags,
            UUID packageId
    ) {}
}

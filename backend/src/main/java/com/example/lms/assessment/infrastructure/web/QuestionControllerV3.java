package com.example.lms.assessment.infrastructure.web;

import com.example.lms.assessment.application.usecase.CreateQuestionUseCaseV3;
import com.example.lms.assessment.application.usecase.UpdateQuestionUseCaseV3;
import com.example.lms.assessment.domain.model.Question;
import com.example.lms.assessment.infrastructure.persistence.entity.QuestionJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.QuestionJpaRepository;
import com.example.lms.shared.domain.model.ContentBlock;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import jakarta.validation.Valid;
import org.springframework.transaction.annotation.Transactional;
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
    private final UpdateQuestionUseCaseV3 updateQuestionUseCase;
    private final QuestionJpaRepository questionRepository;

    @GetMapping("/my-questions")
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR', 'ADMIN')")
    @Operation(summary = "Get questions created by current user")
    public ResponseEntity<ApiResponse<List<java.util.Map<String, Object>>>> getMyQuestions() {
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

        var questions = questionRepository.findAllByCreatedBy(userId);
        List<java.util.Map<String, Object>> result = questions.stream().map(q -> {
            java.util.Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", q.getId().toString());
            String contentText = extractTextFromBlocks(q.getContentBlocks());
            map.put("content", contentText);
            map.put("difficulty", q.getDifficulty() != null ? q.getDifficulty().name() : "MEDIUM");
            map.put("tags", q.getTags());
            map.put("correctOption", q.getCorrectOption());
            map.put("createdAt", q.getCreatedAt() != null ? q.getCreatedAt().toString() : null);
            map.put("status", q.getStatus() != null ? q.getStatus().name() : "ACTIVE");
            return map;
        }).toList();
        
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR', 'ADMIN')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get question by ID")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> getQuestionById(@PathVariable UUID id) {
        var question = questionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Question not found: " + id));
        
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("id", question.getId().toString());
        result.put("content", extractTextFromBlocks(question.getContentBlocks()));
        result.put("contentBlocks", question.getContentBlocks());
        result.put("difficulty", question.getDifficulty() != null ? question.getDifficulty().name() : "MEDIUM");
        result.put("tags", question.getTags());
        result.put("correctOption", question.getCorrectOption());
        result.put("createdAt", question.getCreatedAt() != null ? question.getCreatedAt().toString() : null);
        result.put("updatedAt", question.getUpdatedAt() != null ? question.getUpdatedAt().toString() : null);
        result.put("status", question.getStatus() != null ? question.getStatus().name() : "ACTIVE");
        
        // Map options
        if (question.getOptions() != null) {
            var options = question.getOptions().stream().map(opt -> {
                java.util.Map<String, Object> optMap = new java.util.HashMap<>();
                optMap.put("id", opt.getId() != null ? opt.getId().toString() : null);
                optMap.put("optionKey", opt.getKey());
                optMap.put("content", extractTextFromBlocks(opt.getContentBlocks()));
                optMap.put("contentBlocks", opt.getContentBlocks());
                optMap.put("displayOrder", opt.getOrderIndex());
                return optMap;
            }).toList();
            result.put("options", options);
        }
        
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR', 'ADMIN')")
    @Operation(summary = "Update question by ID")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> updateQuestion(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateQuestionRequest request) {

        var command = new UpdateQuestionUseCaseV3.Command(
                request.blocks(),
                request.correctOption(),
                request.options(),
                request.difficulty(),
                request.tags(),
                request.status()
        );
        updateQuestionUseCase.execute(id, command);

        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("id", id.toString());
        result.put("message", "Question updated successfully");

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    public record UpdateQuestionRequest(
            List<ContentBlock> blocks,
            @NotNull(message = "Correct option is required")
            String correctOption,
            List<String> options,
            Question.Difficulty difficulty,
            String tags,
            Question.Status status
    ) {}

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR', 'ADMIN')")
    @Operation(summary = "Delete question by ID")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> deleteQuestion(@PathVariable UUID id) {
        var question = questionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Question not found: " + id));
        
        questionRepository.delete(question);
        
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("message", "Question deleted successfully");
        
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR', 'ADMIN')")
    @Operation(summary = "Create a new question")
    public ResponseEntity<ApiResponse<UUID>> createQuestion(@Valid @RequestBody CreateQuestionRequest request) {
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
                java.util.Map<String, Object> data = new java.util.HashMap<>();
                data.put("text", optText);
                ContentBlock block = ContentBlock.create("text", data);
                
                optionCommands.add(CreateQuestionUseCaseV3.OptionCommand.builder()
                        .contentBlocks(List.of(block))
                        .isCorrect(isCorrect)
                        .key(key)
                        .orderIndex(index)
                        .build());
                index++;
             }
        }
        
        // Map JPA enum to domain enum
        Question.Difficulty domainDifficulty = request.difficulty() != null
                ? Question.Difficulty.valueOf(request.difficulty().name())
                : Question.Difficulty.MEDIUM;

        return CreateQuestionUseCaseV3.Command.builder()
                .contentBlocks(request.blocks())
                .difficulty(domainDifficulty)
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
            @NotNull(message = "Correct option is required")
            String correctOption,
            List<String> options, // simple text options?
            List<List<ContentBlock>> optionBlocks, // rich text options
            QuestionJpaEntity.Difficulty difficulty,
            String tags,
            @NotNull(message = "Package ID is required")
            UUID packageId
    ) {}

    // ===================== EXCEL IMPORT =====================

    @PostMapping("/import/excel")
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR', 'ADMIN')")
    @Operation(summary = "Import questions from Excel file")
    public ResponseEntity<ApiResponse<ExcelImportResult>> importFromExcel(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam("packageId") UUID packageId,
            @RequestParam("difficulty") QuestionJpaEntity.Difficulty difficulty) {
        
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

        int successCount = 0;
        int failedCount = 0;
        java.util.List<String> errors = new java.util.ArrayList<>();

        try (java.io.InputStream is = file.getInputStream();
             org.apache.poi.ss.usermodel.Workbook workbook = org.apache.poi.ss.usermodel.WorkbookFactory.create(is)) {
            
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.getSheetAt(0);
            
            // Skip header row (row 0), start from row 1
            for (int rowNum = 1; rowNum <= sheet.getLastRowNum(); rowNum++) {
                org.apache.poi.ss.usermodel.Row row = sheet.getRow(rowNum);
                if (row == null) continue;
                
                try {
                    // Column layout: A=Question, B=Option A, C=Option B, D=Option C, E=Option D, F=Correct Answer
                    String questionText = getCellValue(row.getCell(0));
                    String optionA = getCellValue(row.getCell(1));
                    String optionB = getCellValue(row.getCell(2));
                    String optionC = getCellValue(row.getCell(3));
                    String optionD = getCellValue(row.getCell(4));
                    String correctAnswer = getCellValue(row.getCell(5));
                    
                    if (questionText == null || questionText.isBlank()) {
                        continue; // Skip empty rows
                    }
                    
                    // Validate correct answer
                    if (correctAnswer == null || !correctAnswer.matches("[A-Da-d]")) {
                        errors.add("Row " + (rowNum + 1) + ": Invalid correct answer '" + correctAnswer + "'");
                        failedCount++;
                        continue;
                    }
                    
                    // Create ContentBlocks for question
                    java.util.Map<String, Object> questionData = new java.util.HashMap<>();
                    questionData.put("text", questionText);
                    ContentBlock questionBlock = ContentBlock.create("paragraph", questionData);
                    
                    // Create options
                    String[] optionTexts = {optionA, optionB, optionC, optionD};
                    String[] optionKeys = {"A", "B", "C", "D"};
                    String normalizedCorrect = correctAnswer.toUpperCase();
                    
                    java.util.List<com.example.lms.assessment.infrastructure.persistence.entity.QuestionOptionJpaEntity> options = new java.util.ArrayList<>();
                    for (int i = 0; i < 4; i++) {
                        if (optionTexts[i] == null || optionTexts[i].isBlank()) continue;
                        
                        java.util.Map<String, Object> optData = new java.util.HashMap<>();
                        optData.put("text", optionTexts[i]);
                        ContentBlock optBlock = ContentBlock.create("text", optData);
                        
                        var optEntity = com.example.lms.assessment.infrastructure.persistence.entity.QuestionOptionJpaEntity.builder()
                                .key(optionKeys[i])
                                .contentBlocks(java.util.List.of(optBlock))
                                .isCorrect(optionKeys[i].equals(normalizedCorrect))
                                .orderIndex(i)
                                .build();
                        options.add(optEntity);
                    }
                    
                    // Create question entity
                    var questionEntity = QuestionJpaEntity.builder()
                            .contentBlocks(java.util.List.of(questionBlock))
                            .correctOption(normalizedCorrect)
                            .difficulty(difficulty)
                            .status(QuestionJpaEntity.Status.ACTIVE)
                            .createdBy(userId)
                            .packageId(packageId)
                            .options(options)
                            .build();
                    
                    // Set bidirectional relationship
                    for (var opt : options) {
                        opt.setQuestion(questionEntity);
                    }
                    
                    questionRepository.save(questionEntity);
                    successCount++;
                    
                } catch (Exception e) {
                    errors.add("Row " + (rowNum + 1) + ": " + e.getMessage());
                    failedCount++;
                }
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("IMPORT_ERROR", "Failed to read Excel file: " + e.getMessage()));
        }

        ExcelImportResult result = new ExcelImportResult(successCount, failedCount, successCount + failedCount, errors, 
                successCount > 0 ? "Imported " + successCount + " questions successfully" : "No questions imported");
        
        return ResponseEntity.ok(ApiResponse.success(result, result.message()));
    }

    private String getCellValue(org.apache.poi.ss.usermodel.Cell cell) {
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> String.valueOf((int) cell.getNumericCellValue());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default -> null;
        };
    }

    public record ExcelImportResult(
            int successCount,
            int failedCount,
            int totalProcessed,
            java.util.List<String> errors,
            String message
    ) {}

    private String extractTextFromBlocks(java.util.List<com.example.lms.shared.domain.model.ContentBlock> blocks) {
        if (blocks == null || blocks.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (var block : blocks) {
            if (block.getData() != null) {
                Object text = block.getData().get("text");
                if (text != null) {
                    if (sb.length() > 0) sb.append(" ");
                    sb.append(text.toString());
                }
            }
        }
        return sb.toString();
    }
}


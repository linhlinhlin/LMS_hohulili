package com.example.lms.assessment.infrastructure.web;

import com.example.lms.assessment.application.usecase.CreateQuestionUseCaseV3;
import com.example.lms.assessment.application.usecase.UpdateQuestionUseCaseV3;
import com.example.lms.assessment.domain.model.Question;
import com.example.lms.assessment.domain.repository.QuestionRepository;
import com.example.lms.assessment.infrastructure.persistence.entity.QuestionJpaEntity;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.QuestionJpaRepository;
import com.example.lms.shared.domain.model.ContentBlock;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import jakarta.validation.Valid;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v3/questions")
@RequiredArgsConstructor
@Tag(name = "Question V3", description = "Question Management (V3)")
public class QuestionControllerV3 {

    private final CreateQuestionUseCaseV3 createQuestionUseCase;
    private final UpdateQuestionUseCaseV3 updateQuestionUseCase;
    private final QuestionRepository questionRepository;
    private final com.example.lms.assessment.domain.repository.QuestionBankRepository questionBankRepository;
    private final QuestionJpaRepository questionJpaRepository; // Only for Excel import (infra concern)

    // ============== Response DTOs ==============

    public record QuestionSummaryResponse(
            String id,
            String content,
            String difficulty,
            String questionType,
            String tags,
            String correctOption,
            String createdAt,
            String status
    ) {}

    public record QuestionDetailResponse(
            String id,
            String content,
            List<ContentBlock> contentBlocks,
            String difficulty,
            String questionType,
            String tags,
            String correctOption,
            Map<String, Object> answerKey,
            String createdAt,
            String updatedAt,
            String status,
            List<QuestionOptionResponse> options
    ) {}

    public record QuestionOptionResponse(
            String id,
            String optionKey,
            String content,
            List<ContentBlock> contentBlocks,
            Integer displayOrder
    ) {}

    // ============== Endpoints ==============

    @GetMapping("/my-questions")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Get questions created by current user")
    public ResponseEntity<ApiResponse<List<QuestionSummaryResponse>>> getMyQuestions(
            @AuthenticationPrincipal UserJpaEntity currentUser) {
        UUID userId = currentUser.getId();

        List<Question> questions = questionRepository.findAllByCreatedBy(userId);
        List<QuestionSummaryResponse> result = questions.stream()
                .map(this::toSummaryResponse)
                .toList();

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get question by ID")
    public ResponseEntity<ApiResponse<QuestionDetailResponse>> getQuestionById(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserJpaEntity user) {
        verifyQuestionOwnership(id, user);
        Question question = questionRepository.findById(id)
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Câu hỏi", id));

        return ResponseEntity.ok(ApiResponse.success(toDetailResponse(question)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Update question by ID")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateQuestion(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateQuestionRequest request,
            @AuthenticationPrincipal UserJpaEntity user) {

        // S78: Verify ownership — only creator or ADMIN/ORG_ADMIN can update
        verifyQuestionOwnership(id, user);

        // Resolve question type
        Question.QuestionType questionType = null;
        if (request.questionType() != null) {
            try {
                questionType = Question.QuestionType.valueOf(request.questionType().toUpperCase());
            } catch (IllegalArgumentException ignored) { }
        }

        var command = new UpdateQuestionUseCaseV3.Command(
                request.blocks(),
                request.correctOption(),
                request.answerKey(),
                questionType,
                request.options(),
                request.difficulty(),
                request.tags(),
                request.status()
        );
        updateQuestionUseCase.execute(id, command);

        return ResponseEntity.ok(ApiResponse.success(
                Map.of("id", id.toString(), "message", "Cập nhật câu hỏi thành công")));
    }

    public record UpdateQuestionRequest(
            List<ContentBlock> blocks,
            String correctOption,
            Map<String, Object> answerKey,
            String questionType,
            List<String> options,
            Question.Difficulty difficulty,
            String tags,
            Question.Status status
    ) {}

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Transactional
    @Operation(summary = "Delete question by ID")
    public ResponseEntity<ApiResponse<Map<String, String>>> deleteQuestion(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserJpaEntity user) {
        // S78: Verify ownership — only creator or ADMIN/ORG_ADMIN can delete
        verifyQuestionOwnership(id, user);

        // Decrement bank question count before deleting
        var question = questionRepository.findById(id)
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Câu hỏi", id));
        if (question.getPackageId() != null) {
            var bank = questionBankRepository.findById(question.getPackageId())
                    .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Ngân hàng câu hỏi", question.getPackageId()));
            bank.decrementQuestionCount();
            questionBankRepository.save(bank);
        }

        questionRepository.deleteById(id);

        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "Xóa câu hỏi thành công")));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Create a new question")
    public ResponseEntity<ApiResponse<UUID>> createQuestion(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @Valid @RequestBody CreateQuestionRequest request) {
        // Verify teacher owns the target question bank
        verifyBankOwnership(request.packageId(), currentUser);
        UUID userId = currentUser.getId();
        return ResponseEntity.ok(ApiResponse.success(createQuestionUseCase.execute(mapToCommand(request, userId))));
    }

    private CreateQuestionUseCaseV3.Command mapToCommand(CreateQuestionRequest request, UUID userId) {
        List<CreateQuestionUseCaseV3.OptionCommand> optionCommands = new java.util.ArrayList<>();
        String[] keys = {"A", "B", "C", "D", "E", "F"};

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
        } else if (request.options() != null) {
             int index = 0;
             for (String optText : request.options()) {
                String key = (index < keys.length) ? keys[index] : "?";
                boolean isCorrect = key.equals(request.correctOption());

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

        Question.Difficulty domainDifficulty = request.difficulty() != null
                ? Question.Difficulty.valueOf(request.difficulty().name())
                : Question.Difficulty.MEDIUM;

        Question.QuestionType questionType = Question.QuestionType.SINGLE_CHOICE;
        if (request.questionType() != null) {
            try {
                questionType = Question.QuestionType.valueOf(request.questionType().toUpperCase());
            } catch (IllegalArgumentException ignored) {}
        }

        java.util.Map<String, Object> answerKey = request.answerKey();
        if (answerKey == null && request.correctOption() != null) {
            answerKey = java.util.Map.of("correctOption", request.correctOption());
        }

        // Auto-convert content string to contentBlocks if blocks not provided
        List<ContentBlock> questionBlocks = request.blocks();
        if ((questionBlocks == null || questionBlocks.isEmpty())
                && request.content() != null && !request.content().isBlank()) {
            java.util.Map<String, Object> textData = new java.util.HashMap<>();
            textData.put("text", request.content());
            questionBlocks = List.of(ContentBlock.create("text", textData));
        }

        return CreateQuestionUseCaseV3.Command.builder()
                .contentBlocks(questionBlocks)
                .difficulty(domainDifficulty)
                .tags(request.tags())
                .questionType(questionType)
                .correctOption(request.correctOption())
                .answerKey(answerKey)
                .createdBy(userId)
                .packageId(request.packageId())
                .options(optionCommands)
                .build();
    }

    public record CreateQuestionRequest(
            String content,
            List<ContentBlock> blocks,
            String correctOption,
            java.util.Map<String, Object> answerKey,
            String questionType,
            List<String> options,
            List<List<ContentBlock>> optionBlocks,
            QuestionJpaEntity.Difficulty difficulty,
            String tags,
            @NotNull(message = "Mã gói câu hỏi không được để trống")
            UUID packageId
    ) {}

    // ===================== EXCEL IMPORT =====================

    @PostMapping("/import/excel")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Import questions from Excel file")
    public ResponseEntity<ApiResponse<ExcelImportResult>> importFromExcel(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam("packageId") UUID packageId,
            @RequestParam("difficulty") QuestionJpaEntity.Difficulty difficulty) {

        // Verify teacher owns the target question bank before import
        verifyBankOwnership(packageId, currentUser);
        UUID userId = currentUser.getId();

        int successCount = 0;
        int failedCount = 0;
        java.util.List<String> errors = new java.util.ArrayList<>();

        try (java.io.InputStream is = file.getInputStream();
             org.apache.poi.ss.usermodel.Workbook workbook = org.apache.poi.ss.usermodel.WorkbookFactory.create(is)) {

            org.apache.poi.ss.usermodel.Sheet sheet = workbook.getSheetAt(0);

            for (int rowNum = 1; rowNum <= sheet.getLastRowNum(); rowNum++) {
                org.apache.poi.ss.usermodel.Row row = sheet.getRow(rowNum);
                if (row == null) continue;

                try {
                    String questionText = getCellValue(row.getCell(0));
                    String optionA = getCellValue(row.getCell(1));
                    String optionB = getCellValue(row.getCell(2));
                    String optionC = getCellValue(row.getCell(3));
                    String optionD = getCellValue(row.getCell(4));
                    String correctAnswer = getCellValue(row.getCell(5));

                    if (questionText == null || questionText.isBlank()) {
                        continue;
                    }

                    if (correctAnswer == null || !correctAnswer.matches("[A-Da-d]")) {
                        errors.add("Row " + (rowNum + 1) + ": Invalid correct answer '" + correctAnswer + "'");
                        failedCount++;
                        continue;
                    }

                    java.util.Map<String, Object> questionData = new java.util.HashMap<>();
                    questionData.put("text", questionText);
                    ContentBlock questionBlock = ContentBlock.create("paragraph", questionData);

                    String[] optionTexts = {optionA, optionB, optionC, optionD};
                    String[] optionKeys = {"A", "B", "C", "D"};
                    String normalizedCorrect = correctAnswer.toUpperCase();

                    List<Question.QuestionOption> options = new java.util.ArrayList<>();
                    for (int i = 0; i < 4; i++) {
                        if (optionTexts[i] == null || optionTexts[i].isBlank()) continue;

                        java.util.Map<String, Object> optData = new java.util.HashMap<>();
                        optData.put("text", optionTexts[i]);
                        ContentBlock optBlock = ContentBlock.create("text", optData);

                        options.add(Question.QuestionOption.create(optionKeys[i], List.of(optBlock), i));
                    }

                    Question question = Question.builder()
                            .contentBlocks(List.of(questionBlock))
                            .questionType(Question.QuestionType.SINGLE_CHOICE)
                            .correctOption(normalizedCorrect)
                            .answerKey(Map.of("correctOption", normalizedCorrect))
                            .difficulty(Question.Difficulty.valueOf(difficulty.name()))
                            .status(Question.Status.ACTIVE)
                            .createdBy(userId)
                            .packageId(packageId)
                            .options(options)
                            .build();

                    questionRepository.save(question);
                    successCount++;

                } catch (IllegalArgumentException | IllegalStateException e) {
                    errors.add("Row " + (rowNum + 1) + ": " + e.getMessage());
                    failedCount++;
                }
            }
        } catch (java.io.IOException | org.apache.poi.ooxml.POIXMLException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("IMPORT_ERROR", "Không thể đọc file Excel: " + e.getMessage()));
        }

        // Update bank question count after import
        if (successCount > 0) {
            final int imported = successCount;
            var bank = questionBankRepository.findById(packageId)
                    .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Ngân hàng câu hỏi", packageId));
            bank.setQuestionCount(bank.getQuestionCount() + imported);
            questionBankRepository.save(bank);
        }

        ExcelImportResult result = new ExcelImportResult(successCount, failedCount, successCount + failedCount, errors,
                successCount > 0 ? "Đã nhập thành công " + successCount + " câu hỏi" : "Không có câu hỏi nào được nhập");

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

    // ============== Helpers ==============

    private QuestionSummaryResponse toSummaryResponse(Question q) {
        return new QuestionSummaryResponse(
                q.getId().toString(),
                extractTextFromBlocks(q.getContentBlocks()),
                q.getDifficulty() != null ? q.getDifficulty().name() : "MEDIUM",
                q.getQuestionType() != null ? q.getQuestionType().name() : "SINGLE_CHOICE",
                q.getTags(),
                q.getCorrectOption(),
                q.getCreatedAt() != null ? q.getCreatedAt().toString() : null,
                q.getStatus() != null ? q.getStatus().name() : "ACTIVE"
        );
    }

    private QuestionDetailResponse toDetailResponse(Question q) {
        List<QuestionOptionResponse> optionResponses = null;
        if (q.getOptions() != null) {
            optionResponses = q.getOptions().stream()
                    .map(opt -> new QuestionOptionResponse(
                            opt.getId() != null ? opt.getId().toString() : null,
                            opt.getKey(),
                            extractTextFromBlocks(opt.getContentBlocks()),
                            opt.getContentBlocks(),
                            opt.getOrderIndex()
                    ))
                    .toList();
        }

        return new QuestionDetailResponse(
                q.getId().toString(),
                extractTextFromBlocks(q.getContentBlocks()),
                q.getContentBlocks(),
                q.getDifficulty() != null ? q.getDifficulty().name() : "MEDIUM",
                q.getQuestionType() != null ? q.getQuestionType().name() : "SINGLE_CHOICE",
                q.getTags(),
                q.getCorrectOption(),
                q.getAnswerKey(),
                q.getCreatedAt() != null ? q.getCreatedAt().toString() : null,
                q.getUpdatedAt() != null ? q.getUpdatedAt().toString() : null,
                q.getStatus() != null ? q.getStatus().name() : "ACTIVE",
                optionResponses
        );
    }

    private String extractTextFromBlocks(List<ContentBlock> blocks) {
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

    // ============== Ownership Helpers ==============

    private boolean isAdminRole(UserJpaEntity user) {
        return user.getRole() == UserJpaEntity.UserRole.ADMIN
            || user.getRole() == UserJpaEntity.UserRole.ORG_ADMIN;
    }

    private void verifyQuestionOwnership(UUID questionId, UserJpaEntity user) {
        if (isAdminRole(user)) return;
        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Câu hỏi", questionId));
        if (question.getCreatedBy() == null || !question.getCreatedBy().equals(user.getId())) {
            throw new AccessDeniedException("Bạn không sở hữu câu hỏi này");
        }
    }

    private void verifyBankOwnership(UUID bankId, UserJpaEntity user) {
        if (isAdminRole(user)) return;
        var bank = questionBankRepository.findById(bankId)
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Gói câu hỏi", bankId));
        if (!bank.isOwnedBy(user.getId())) {
            throw new AccessDeniedException("Bạn không sở hữu gói câu hỏi này");
        }
    }
}

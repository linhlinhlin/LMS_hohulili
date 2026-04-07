package com.example.lms.assessment.infrastructure.web;

import com.example.lms.assessment.application.usecase.CreateQuestionUseCaseV3;
import com.example.lms.assessment.application.usecase.UpdateQuestionUseCaseV3;
import com.example.lms.assessment.domain.model.Question;
import com.example.lms.assessment.domain.repository.QuestionRepository;
import com.example.lms.assessment.infrastructure.persistence.entity.QuestionJpaEntity;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.QuestionJpaRepository;
import com.example.lms.shared.domain.model.ContentBlock;
import com.example.lms.shared.infrastructure.persistence.repository.FileAttachmentJpaRepository;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import jakarta.validation.Valid;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v3/questions")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Question V3", description = "Question Management (V3)")
public class QuestionControllerV3 {

    private final CreateQuestionUseCaseV3 createQuestionUseCase;
    private final UpdateQuestionUseCaseV3 updateQuestionUseCase;
    private final QuestionRepository questionRepository;
    private final com.example.lms.assessment.domain.repository.QuestionBankRepository questionBankRepository;
    private final QuestionJpaRepository questionJpaRepository; // Only for Excel import (infra concern)
    private final FileAttachmentJpaRepository fileAttachmentJpaRepository;
    private final com.example.lms.shared.infrastructure.service.FileManagementService fileManagementService;

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

        updateQuestionUseCase.execute(id, mapToUpdateCommand(request));

        return ResponseEntity.ok(ApiResponse.success(
                Map.of("id", id.toString(), "message", "Cập nhật câu hỏi thành công")));
    }

    public record UpdateQuestionRequest(
            List<ContentBlock> blocks,
            String correctOption,
            Map<String, Object> answerKey,
            String questionType,
            List<String> options,
            List<List<ContentBlock>> optionBlocks,
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

        // Support MULTIPLE_CHOICE: correctOption may be comma-separated (e.g. "A,C")
        java.util.Set<String> correctKeys = new java.util.HashSet<>();
        if (request.correctOption() != null) {
            for (String k : request.correctOption().split(",")) {
                correctKeys.add(k.trim());
            }
        }

        if (request.optionBlocks() != null && !request.optionBlocks().isEmpty()) {
            int index = 0;
            for (List<ContentBlock> blocks : request.optionBlocks()) {
                String key = (index < keys.length) ? keys[index] : "?";
                boolean isCorrect = correctKeys.contains(key);

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
                boolean isCorrect = correctKeys.contains(key);

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
            if (correctKeys.size() > 1) {
                // MULTIPLE_CHOICE: {"correctOptions": ["A", "C"]}
                answerKey = java.util.Map.of("correctOptions", new java.util.ArrayList<>(correctKeys));
            } else {
                answerKey = java.util.Map.of("correctOption", request.correctOption());
            }
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

    private UpdateQuestionUseCaseV3.Command mapToUpdateCommand(UpdateQuestionRequest request) {
        Question.QuestionType questionType = null;
        if (request.questionType() != null) {
            try {
                questionType = Question.QuestionType.valueOf(request.questionType().toUpperCase());
            } catch (IllegalArgumentException ignored) { }
        }

        List<UpdateQuestionUseCaseV3.OptionCommand> optionCommands = null;
        if (request.optionBlocks() != null && !request.optionBlocks().isEmpty()) {
            optionCommands = new java.util.ArrayList<>();
            String[] keys = {"A", "B", "C", "D", "E", "F"};

            for (int index = 0; index < request.optionBlocks().size(); index++) {
                List<ContentBlock> blocks = request.optionBlocks().get(index);
                String key = index < keys.length ? keys[index] : "?";
                optionCommands.add(new UpdateQuestionUseCaseV3.OptionCommand(blocks, index, key));
            }
        }

        // Auto-build answerKey if not provided (same logic as create)
        java.util.Map<String, Object> answerKey = request.answerKey();
        if (answerKey == null && request.correctOption() != null) {
            java.util.Set<String> correctKeys = new java.util.HashSet<>();
            for (String k : request.correctOption().split(",")) {
                correctKeys.add(k.trim());
            }
            if (correctKeys.size() > 1) {
                answerKey = java.util.Map.of("correctOptions", new java.util.ArrayList<>(correctKeys));
            } else {
                answerKey = java.util.Map.of("correctOption", request.correctOption());
            }
        }

        return new UpdateQuestionUseCaseV3.Command(
                request.blocks(),
                request.correctOption(),
                answerKey,
                questionType,
                request.options(),
                optionCommands,
                request.difficulty(),
                request.tags(),
                request.status()
        );
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

    // ============== DOCX Import (Moodle2Word SOTA pattern) ==============

    // Step 1: Preview — parse DOCX, upload images, return parsed questions for teacher review
    @PostMapping("/import/docx/preview")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Preview questions from Word file before importing")
    public ResponseEntity<ApiResponse<DocxPreviewResult>> previewDocx(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {

        UUID userId = currentUser.getId();
        try (java.io.InputStream is = file.getInputStream()) {
            org.apache.poi.xwpf.usermodel.XWPFDocument doc = new org.apache.poi.xwpf.usermodel.XWPFDocument(is);

            // Upload images
            Map<String, String> imageUrlMap = uploadDocxImages(doc, userId);

            // Parse
            List<ParsedDocxQuestion> parsed = parseDocxParagraphs(doc, imageUrlMap);
            doc.close();

            // Convert to preview DTOs
            List<Map<String, Object>> previews = new java.util.ArrayList<>();
            for (int i = 0; i < parsed.size(); i++) {
                ParsedDocxQuestion pq = parsed.get(i);
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("index", i);

                // Extract question text from blocks
                String qText = pq.questionBlocks.stream()
                        .filter(b -> "paragraph".equals(b.getType()) || "text".equals(b.getType()))
                        .map(b -> {
                            Object t = b.getData() != null ? b.getData().get("text") : null;
                            return t != null ? t.toString() : "";
                        })
                        .filter(s -> !s.isEmpty())
                        .collect(java.util.stream.Collectors.joining(" "));
                item.put("questionText", qText);
                item.put("questionBlocks", pq.questionBlocks);
                item.put("hasImage", pq.questionBlocks.stream().anyMatch(b -> "image".equals(b.getType())));

                // Options
                List<Map<String, Object>> optPreviews = new java.util.ArrayList<>();
                String[] fallbackKeys = {"A", "B", "C", "D", "E", "F"};
                for (int j = 0; j < pq.options.size(); j++) {
                    String key = j < pq.optionKeys.size() ? pq.optionKeys.get(j) : fallbackKeys[j];
                    String optText = pq.options.get(j).stream()
                            .filter(b -> "text".equals(b.getType()) || "paragraph".equals(b.getType()))
                            .map(b -> b.getData() != null ? String.valueOf(b.getData().getOrDefault("text", "")) : "")
                            .collect(java.util.stream.Collectors.joining(" "));
                    boolean hasImg = pq.options.get(j).stream().anyMatch(b -> "image".equals(b.getType()));
                    optPreviews.add(Map.of("key", key, "text", optText, "isCorrect", pq.correctKeys.contains(key), "hasImage", hasImg));
                }
                item.put("options", optPreviews);
                item.put("correctKeys", pq.correctKeys);

                // Detect type
                boolean isTF = pq.optionKeys.size() == 2 && pq.optionKeys.stream()
                        .allMatch(k -> "Đ".equals(k) || "S".equals(k) || "T".equals(k) || "F".equals(k));
                item.put("questionType", isTF ? "TRUE_FALSE" : pq.correctKeys.size() > 1 ? "MULTIPLE_CHOICE" : "SINGLE_CHOICE");

                // Validation
                List<String> warnings = new java.util.ArrayList<>();
                if (pq.options.size() < 2) warnings.add("Cần ít nhất 2 đáp án");
                if (pq.correctKeys.isEmpty()) warnings.add("Chưa đánh dấu đáp án đúng");
                item.put("warnings", warnings);
                item.put("valid", warnings.isEmpty());

                previews.add(item);
            }

            long validCount = previews.stream().filter(p -> (boolean) p.get("valid")).count();
            return ResponseEntity.ok(ApiResponse.success(new DocxPreviewResult(
                    previews, previews.size(), (int) validCount, previews.size() - (int) validCount)));

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("PARSE_ERROR", "Không thể đọc file: " + e.getMessage()));
        }
    }

    public record DocxPreviewResult(
            List<Map<String, Object>> questions,
            int totalQuestions,
            int validCount,
            int invalidCount
    ) {}

    // Step 2: Confirm — save previewed questions to DB
    @PostMapping("/import/docx/confirm")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Confirm and save previewed DOCX questions")
    public ResponseEntity<ApiResponse<ExcelImportResult>> confirmDocxImport(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam("packageId") UUID packageId,
            @RequestParam("difficulty") QuestionJpaEntity.Difficulty difficulty) {

        verifyBankOwnership(packageId, currentUser);
        UUID userId = currentUser.getId();

        int successCount = 0;
        int failedCount = 0;
        java.util.List<String> errors = new java.util.ArrayList<>();

        try (java.io.InputStream is = file.getInputStream()) {
            org.apache.poi.xwpf.usermodel.XWPFDocument doc = new org.apache.poi.xwpf.usermodel.XWPFDocument(is);
            Map<String, String> imageUrlMap = uploadDocxImages(doc, userId);
            List<ParsedDocxQuestion> parsedQuestions = parseDocxParagraphs(doc, imageUrlMap);
            doc.close();

            for (int i = 0; i < parsedQuestions.size(); i++) {
                try {
                    ParsedDocxQuestion pq = parsedQuestions.get(i);
                    if (pq.options.size() < 2 || pq.correctKeys.isEmpty()) {
                        failedCount++;
                        continue;
                    }

                    boolean isTF = pq.optionKeys.size() == 2 && pq.optionKeys.stream()
                            .allMatch(k -> "Đ".equals(k) || "S".equals(k) || "T".equals(k) || "F".equals(k));
                    boolean isMulti = pq.correctKeys.size() > 1;
                    Question.QuestionType qType = isTF ? Question.QuestionType.TRUE_FALSE
                            : isMulti ? Question.QuestionType.MULTIPLE_CHOICE : Question.QuestionType.SINGLE_CHOICE;

                    List<Question.QuestionOption> options = new java.util.ArrayList<>();
                    String[] fallbackKeys = {"A", "B", "C", "D", "E", "F"};
                    for (int j = 0; j < pq.options.size(); j++) {
                        String key = j < pq.optionKeys.size() ? pq.optionKeys.get(j) : fallbackKeys[j];
                        options.add(Question.QuestionOption.create(key, pq.options.get(j), j));
                    }

                    String correctStr = String.join(",", pq.correctKeys);
                    Map<String, Object> answerKey = isMulti
                            ? Map.of("correctOptions", pq.correctKeys)
                            : Map.of("correctOption", pq.correctKeys.get(0));

                    questionRepository.save(Question.builder()
                            .contentBlocks(pq.questionBlocks).questionType(qType)
                            .correctOption(correctStr).answerKey(answerKey)
                            .difficulty(Question.Difficulty.valueOf(difficulty.name()))
                            .status(Question.Status.ACTIVE).createdBy(userId)
                            .packageId(packageId).options(options).build());
                    successCount++;
                } catch (Exception e) {
                    errors.add("Câu " + (i + 1) + ": " + e.getMessage());
                    failedCount++;
                }
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("IMPORT_ERROR", "Lỗi: " + e.getMessage()));
        }

        if (successCount > 0) {
            var bank = questionBankRepository.findById(packageId)
                    .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Ngân hàng câu hỏi", packageId));
            bank.setQuestionCount(bank.getQuestionCount() + successCount);
            questionBankRepository.save(bank);
        }

        return ResponseEntity.ok(ApiResponse.success(new ExcelImportResult(successCount, failedCount,
                successCount + failedCount, errors,
                successCount > 0 ? "Đã nhập " + successCount + " câu hỏi" : "Không có câu hỏi nào được nhập")));
    }

    // Shared: upload DOCX images
    private Map<String, String> uploadDocxImages(org.apache.poi.xwpf.usermodel.XWPFDocument doc, UUID userId) {
        Map<String, String> imageUrlMap = new HashMap<>();
        for (org.apache.poi.xwpf.usermodel.XWPFPictureData pic : doc.getAllPictures()) {
            try {
                String ext = pic.suggestFileExtension();
                String contentType = "image/" + (ext.equals("jpg") ? "jpeg" : ext);
                final byte[] picBytes = pic.getData();
                final String picName = "import-" + pic.getChecksum() + "." + ext;
                org.springframework.web.multipart.MultipartFile mockFile = new org.springframework.web.multipart.MultipartFile() {
                    public String getName() { return "image"; }
                    public String getOriginalFilename() { return picName; }
                    public String getContentType() { return contentType; }
                    public boolean isEmpty() { return picBytes.length == 0; }
                    public long getSize() { return picBytes.length; }
                    public byte[] getBytes() { return picBytes; }
                    public java.io.InputStream getInputStream() { return new java.io.ByteArrayInputStream(picBytes); }
                    public void transferTo(java.io.File dest) throws java.io.IOException { java.nio.file.Files.write(dest.toPath(), picBytes); }
                };
                var attachment = fileManagementService.uploadFile(mockFile, "editor-images", userId);
                imageUrlMap.put(String.valueOf(pic.getChecksum()), attachment.getFileUrl());
            } catch (Exception e) {
                log.warn("Failed to upload image from DOCX: {}", e.getMessage());
            }
        }
        return imageUrlMap;
    }

    // --- DOCX Parser helpers ---

    private record ParsedDocxQuestion(
            List<ContentBlock> questionBlocks,
            List<List<ContentBlock>> options,
            List<String> correctKeys,  // supports multiple correct answers
            List<String> optionKeys    // actual keys used (A/B/C/D or Đ/S)
    ) {}

    private List<ParsedDocxQuestion> parseDocxParagraphs(
            org.apache.poi.xwpf.usermodel.XWPFDocument doc,
            Map<String, String> imageUrlMap) {

        List<ParsedDocxQuestion> questions = new java.util.ArrayList<>();
        List<ContentBlock> currentQuestionBlocks = new java.util.ArrayList<>();
        List<List<ContentBlock>> currentOptions = new java.util.ArrayList<>();
        List<String> currentCorrectKeys = new java.util.ArrayList<>();
        List<String> currentOptKeys = new java.util.ArrayList<>();
        boolean inQuestion = false;

        for (org.apache.poi.xwpf.usermodel.XWPFParagraph para : doc.getParagraphs()) {
            String text = para.getText().trim();

            // Handle standalone image paragraphs (no text, only pictures)
            boolean hasImages = para.getRuns().stream().anyMatch(r -> !r.getEmbeddedPictures().isEmpty());
            if (text.isEmpty() && hasImages && inQuestion) {
                // Standalone image paragraph → append to current question or last option
                if (currentOptions.isEmpty()) {
                    addParagraphImages(para, imageUrlMap, currentQuestionBlocks);
                } else {
                    addParagraphImages(para, imageUrlMap, currentOptions.get(currentOptions.size() - 1));
                }
                continue;
            }
            if (text.isEmpty()) continue;

            // Check if this is a new question (starts with number + . or number + ))
            java.util.regex.Matcher qMatcher = java.util.regex.Pattern.compile("^(\\d+)[.)\\s]\\s*(.*)").matcher(text);
            // Check if this is an option: A. B. C. D. or Đ. S. (TRUE_FALSE) or T. F.
            java.util.regex.Matcher optMatcher = java.util.regex.Pattern.compile("^\\*?\\s*([A-Fa-fĐđSsTtFf])[.)\\s]\\s*(.*)").matcher(text);

            if (qMatcher.matches()) {
                // Save previous question if exists
                if (inQuestion && !currentQuestionBlocks.isEmpty()) {
                    questions.add(new ParsedDocxQuestion(new java.util.ArrayList<>(currentQuestionBlocks),
                            new java.util.ArrayList<>(currentOptions),
                            new java.util.ArrayList<>(currentCorrectKeys),
                            new java.util.ArrayList<>(currentOptKeys)));
                }
                // Start new question
                currentQuestionBlocks = new java.util.ArrayList<>();
                currentOptions = new java.util.ArrayList<>();
                currentCorrectKeys = new java.util.ArrayList<>();
                currentOptKeys = new java.util.ArrayList<>();
                inQuestion = true;

                String qText = qMatcher.group(2).trim();
                if (!qText.isEmpty()) {
                    currentQuestionBlocks.add(ContentBlock.create("paragraph", Map.of("text", qText)));
                }

                // Extract inline images from paragraph
                addParagraphImages(para, imageUrlMap, currentQuestionBlocks);

            } else if (optMatcher.matches() && inQuestion) {
                String optKey = optMatcher.group(1).toUpperCase();
                String optText = optMatcher.group(2).trim();
                // Detect correct answer: * at line start OR * at option text start
                boolean isCorrect = text.startsWith("*") || optText.startsWith("*");
                if (optText.startsWith("*")) optText = optText.substring(1).trim();

                List<ContentBlock> optBlocks = new java.util.ArrayList<>();
                if (!optText.isEmpty()) {
                    optBlocks.add(ContentBlock.create("text", Map.of("text", optText)));
                }
                addParagraphImages(para, imageUrlMap, optBlocks);

                currentOptions.add(optBlocks);
                currentOptKeys.add(optKey);
                if (isCorrect) {
                    currentCorrectKeys.add(optKey);
                }

            } else if (inQuestion) {
                // Continuation of question text
                currentQuestionBlocks.add(ContentBlock.create("paragraph", Map.of("text", text)));
                addParagraphImages(para, imageUrlMap, currentQuestionBlocks);
            }
        }

        // Don't forget last question
        if (inQuestion && !currentQuestionBlocks.isEmpty()) {
            questions.add(new ParsedDocxQuestion(currentQuestionBlocks, currentOptions, currentCorrectKeys, currentOptKeys));
        }

        return questions;
    }

    private void addParagraphImages(
            org.apache.poi.xwpf.usermodel.XWPFParagraph para,
            Map<String, String> imageUrlMap,
            List<ContentBlock> blocks) {
        for (org.apache.poi.xwpf.usermodel.XWPFRun run : para.getRuns()) {
            for (org.apache.poi.xwpf.usermodel.XWPFPicture pic : run.getEmbeddedPictures()) {
                String checksum = String.valueOf(pic.getPictureData().getChecksum());
                String url = imageUrlMap.get(checksum);
                if (url != null) {
                    blocks.add(ContentBlock.create("image", Map.of(
                            "file", Map.of("url", url),
                            "caption", "",
                            "withBorder", false,
                            "stretched", false,
                            "withBackground", false
                    )));
                }
            }
        }
    }

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
        List<ContentBlock> normalizedQuestionBlocks = normalizeImageBlocks(q.getContentBlocks());
        List<QuestionOptionResponse> optionResponses = null;
        if (q.getOptions() != null) {
            optionResponses = q.getOptions().stream()
                    .map(opt -> new QuestionOptionResponse(
                            opt.getId() != null ? opt.getId().toString() : null,
                            opt.getKey(),
                            extractTextFromBlocks(normalizeImageBlocks(opt.getContentBlocks())),
                            normalizeImageBlocks(opt.getContentBlocks()),
                            opt.getOrderIndex()
                    ))
                    .toList();
        }

        return new QuestionDetailResponse(
                q.getId().toString(),
                extractTextFromBlocks(normalizedQuestionBlocks),
                normalizedQuestionBlocks,
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

    private List<ContentBlock> normalizeImageBlocks(List<ContentBlock> blocks) {
        if (blocks == null || blocks.isEmpty()) {
            return blocks;
        }

        return blocks.stream()
                .map(this::normalizeImageBlock)
                .toList();
    }

    private ContentBlock normalizeImageBlock(ContentBlock block) {
        if (block == null || !"image".equals(block.getType()) || block.getData() == null) {
            return block;
        }

        Map<String, Object> data = new HashMap<>(block.getData());
        Map<String, Object> fileData = data.get("file") instanceof Map<?, ?> file
                ? new HashMap<>((Map<String, Object>) file)
                : new HashMap<>();

        String rawUrl = stringValue(data.get("url"));
        String rawFileUrl = stringValue(fileData.get("url"));
        String fileId = stringValue(fileData.get("id"));

        String resolvedUrl = resolveAttachmentUrl(rawUrl)
                .or(() -> resolveAttachmentUrl(rawFileUrl))
                .or(() -> resolveAttachmentUrl(fileId))
                .orElse(null);

        if (resolvedUrl == null) {
            return block;
        }

        data.put("url", resolvedUrl);
        fileData.put("url", resolvedUrl);
        if (fileId == null || fileId.isBlank()) {
            UUID inferredId = tryParseUuid(rawUrl).or(() -> tryParseUuid(rawFileUrl)).orElse(null);
            if (inferredId != null) {
                fileData.put("id", inferredId.toString());
            }
        }
        data.put("file", fileData);

        return block.withData(data);
    }

    private Optional<String> resolveAttachmentUrl(String candidate) {
        return tryParseUuid(candidate)
                .flatMap(fileAttachmentJpaRepository::findById)
                .map(attachment -> attachment.getFileUrl());
    }

    private Optional<UUID> tryParseUuid(String value) {
        if (value == null || value.isBlank() || value.startsWith("http")) {
            return Optional.empty();
        }

        try {
            return Optional.of(UUID.fromString(value));
        } catch (IllegalArgumentException ignored) {
            return Optional.empty();
        }
    }

    private String stringValue(Object value) {
        return value != null ? value.toString() : null;
    }

    private String extractTextFromBlocks(List<ContentBlock> blocks) {
        if (blocks == null || blocks.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (var block : blocks) {
            if (block.getData() != null) {
                Object text = block.getData().get("text");
                if (text == null) {
                    text = block.getData().get("html");
                }
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

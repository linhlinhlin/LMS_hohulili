package com.example.lms.assessment.infrastructure.web;

import com.example.lms.assessment.application.usecase.QuestionBankManagementUseCase;
import com.example.lms.assessment.application.usecase.QuestionImportExportUseCase;
import com.example.lms.assessment.domain.model.Question;
import com.example.lms.assessment.domain.model.QuestionBank;
import com.example.lms.assessment.domain.model.QuestionBankCategory;
import com.example.lms.assessment.infrastructure.persistence.entity.QuestionJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.QuestionJpaRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

/**
 * REST controller for QuestionBank management.
 */
@RestController
@RequestMapping("/api/v3/question-banks")
@Tag(name = "Question Bank V3", description = "Question Bank Management")
public class QuestionBankControllerV3 {

    private final QuestionBankManagementUseCase useCase;
    private final QuestionImportExportUseCase importExportUseCase;
    private final QuestionJpaRepository questionJpaRepository;

    public QuestionBankControllerV3(QuestionBankManagementUseCase useCase,
                                     QuestionImportExportUseCase importExportUseCase,
                                     QuestionJpaRepository questionJpaRepository) {
        this.useCase = useCase;
        this.importExportUseCase = importExportUseCase;
        this.questionJpaRepository = questionJpaRepository;
    }

    // ============ Bank CRUD ============

    @GetMapping("/my-banks")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Get current user's question banks")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getMyBanks(
            @AuthenticationPrincipal UserJpaEntity user) {
        List<QuestionBank> banks = useCase.getMyBanks(user.getId());
        List<Map<String, Object>> result = banks.stream().map(this::toBankMap).toList();
        return ResponseEntity.ok(ApiResponse.success(result, "Danh sách ngân hàng câu hỏi"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Get question bank by ID with category tree")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getBankById(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserJpaEntity user) {
        QuestionBank bank = useCase.getBankById(id);
        // Ownership check: only owner, admins, or PUBLIC banks
        if (!isAdminRole(user) && !bank.getOwnerId().equals(user.getId())
                && bank.getVisibility() != QuestionBank.Visibility.PUBLIC) {
            throw new org.springframework.security.access.AccessDeniedException("Bạn không có quyền xem ngân hàng câu hỏi này");
        }
        List<QuestionBankCategory> categoryTree = useCase.getCategoryTree(id);

        Map<String, Object> result = toBankMap(bank);
        result.put("categories", categoryTree.stream().map(this::toCategoryTreeMap).toList());

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Create a new question bank")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createBank(
            @Valid @RequestBody CreateBankRequest request,
            @AuthenticationPrincipal UserJpaEntity user) {

        QuestionBank.BankType bankType = QuestionBank.BankType.PERSONAL;
        if (request.bankType() != null) {
            try { bankType = QuestionBank.BankType.valueOf(request.bankType().toUpperCase()); } catch (IllegalArgumentException ignored) {}
        }

        QuestionBank.Visibility visibility = QuestionBank.Visibility.PRIVATE;
        if (request.visibility() != null) {
            try { visibility = QuestionBank.Visibility.valueOf(request.visibility().toUpperCase()); } catch (IllegalArgumentException ignored) {}
        }

        var command = new QuestionBankManagementUseCase.CreateBankCommand(
                request.name(), request.description(), request.subject(),
                user.getId(), bankType, visibility
        );

        QuestionBank bank = useCase.createBank(command);
        return ResponseEntity.ok(ApiResponse.success(toBankMap(bank), "Tạo ngân hàng câu hỏi thành công"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Update question bank")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateBank(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateBankRequest request,
            @AuthenticationPrincipal UserJpaEntity user) {

        QuestionBank.Visibility visibility = null;
        if (request.visibility() != null) {
            try { visibility = QuestionBank.Visibility.valueOf(request.visibility().toUpperCase()); } catch (IllegalArgumentException ignored) {}
        }

        var command = new QuestionBankManagementUseCase.UpdateBankCommand(
                request.name(), request.description(), request.subject(), visibility
        );

        QuestionBank bank = useCase.updateBank(id, command, user.getId(), isAdminRole(user));
        return ResponseEntity.ok(ApiResponse.success(toBankMap(bank), "Cập nhật ngân hàng câu hỏi thành công"));
    }

    @PostMapping("/{id}/archive")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Archive question bank")
    public ResponseEntity<ApiResponse<Void>> archiveBank(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserJpaEntity user) {
        useCase.archiveBank(id, user.getId(), isAdminRole(user));
        return ResponseEntity.ok(ApiResponse.success("Kho câu hỏi đã được lưu trữ"));
    }

    // ============ Category CRUD ============

    @GetMapping("/{id}/categories")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Get category tree for a bank")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getCategoryTree(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserJpaEntity user) {
        // P0: Verify bank access (owner, admin, or PUBLIC)
        verifyBankAccess(id, user);
        List<QuestionBankCategory> tree = useCase.getCategoryTree(id);
        List<Map<String, Object>> result = tree.stream().map(this::toCategoryTreeMap).toList();
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping("/{id}/categories")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Add category to bank")
    public ResponseEntity<ApiResponse<Map<String, Object>>> addCategory(
            @PathVariable UUID id,
            @Valid @RequestBody AddCategoryRequest request,
            @AuthenticationPrincipal UserJpaEntity user) {

        var command = new QuestionBankManagementUseCase.AddCategoryCommand(
                request.name(), request.description(), request.parentId(),
                request.sortOrder() != null ? request.sortOrder() : 0
        );

        QuestionBankCategory category = useCase.addCategory(id, command, user.getId());
        return ResponseEntity.ok(ApiResponse.success(toCategoryMap(category), "Thêm danh mục thành công"));
    }

    @PutMapping("/categories/{catId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Update category")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateCategory(
            @PathVariable UUID catId,
            @Valid @RequestBody UpdateCategoryRequest request,
            @AuthenticationPrincipal UserJpaEntity user) {

        var command = new QuestionBankManagementUseCase.UpdateCategoryCommand(
                request.name(), request.description(), request.sortOrder()
        );

        QuestionBankCategory category = useCase.updateCategory(catId, command, user.getId());
        return ResponseEntity.ok(ApiResponse.success(toCategoryMap(category), "Cập nhật danh mục thành công"));
    }

    @DeleteMapping("/categories/{catId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Delete category")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(
            @PathVariable UUID catId,
            @AuthenticationPrincipal UserJpaEntity user) {
        useCase.deleteCategory(catId, user.getId());
        return ResponseEntity.ok(ApiResponse.success("Đã xóa danh mục"));
    }

    // ============ Questions ============

    @GetMapping("/{id}/questions")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Get questions in bank (optionally filtered by category)")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getBankQuestions(
            @PathVariable UUID id,
            @RequestParam(required = false) UUID categoryId,
            @AuthenticationPrincipal UserJpaEntity user) {
        // P0: Verify bank access (owner, admin, or PUBLIC)
        verifyBankAccess(id, user);
        List<Question> questions = useCase.getBankQuestions(id, categoryId);
        List<Map<String, Object>> result = questions.stream().map(this::toQuestionMap).toList();
        return ResponseEntity.ok(ApiResponse.success(result, "Danh sách câu hỏi"));
    }

    @PostMapping("/copy-questions")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Deep-copy questions from accessible banks into a bank owned by the caller")
    public ResponseEntity<ApiResponse<Map<String, Object>>> copyQuestions(
            @Valid @RequestBody CopyQuestionsRequest request,
            @AuthenticationPrincipal UserJpaEntity user) {

        var command = new QuestionBankManagementUseCase.CopyQuestionsCommand(
                request.questionIds(), request.targetBankId(), request.targetCategoryId()
        );

        List<Question> copies = useCase.copyQuestionsToBank(command, user.getId());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("copiedCount", copies.size());
        result.put("targetBankId", request.targetBankId().toString());
        return ResponseEntity.ok(ApiResponse.success(result, "Đã sao chép " + copies.size() + " câu hỏi vào ngân hàng của bạn"));
    }

    @PostMapping("/move-questions")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Move questions to a target bank/category")
    public ResponseEntity<ApiResponse<Void>> moveQuestions(
            @Valid @RequestBody MoveQuestionsRequest request,
            @AuthenticationPrincipal UserJpaEntity user) {

        var command = new QuestionBankManagementUseCase.MoveQuestionsCommand(
                request.questionIds(), request.targetBankId(), request.targetCategoryId()
        );

        useCase.moveQuestionsToBank(command, user.getId());
        return ResponseEntity.ok(ApiResponse.success("Đã di chuyển câu hỏi thành công"));
    }

    @GetMapping("/public")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Get all PUBLIC question banks from other teachers")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getPublicBanks(
            @AuthenticationPrincipal UserJpaEntity user) {
        List<QuestionBank> banks = useCase.getBanksByVisibility(QuestionBank.Visibility.PUBLIC);
        // Return all PUBLIC + ACTIVE banks — including caller's own (FE shows "Của bạn" badge)
        banks = banks.stream()
                .filter(b -> b.getStatus() == QuestionBank.Status.ACTIVE)
                .toList();
        List<Map<String, Object>> result = banks.stream().map(this::toBankMap).toList();
        return ResponseEntity.ok(ApiResponse.success(result, "Ngân hàng câu hỏi công khai"));
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Search question banks by name")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> searchBanks(
            @RequestParam String query,
            @AuthenticationPrincipal UserJpaEntity user) {
        List<QuestionBank> banks = useCase.searchBanks(query);
        // P1: Filter out PRIVATE banks that don't belong to the current user
        if (!isAdminRole(user)) {
            banks = banks.stream()
                    .filter(b -> b.getOwnerId().equals(user.getId())
                            || b.getVisibility() != QuestionBank.Visibility.PRIVATE)
                    .toList();
        }
        List<Map<String, Object>> result = banks.stream().map(this::toBankMap).toList();
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    // ============ Request DTOs ============

    public record CreateBankRequest(
            @NotBlank(message = "Tên ngân hàng không được để trống") String name,
            String description,
            String subject,
            String bankType,
            String visibility
    ) {}

    public record UpdateBankRequest(
            String name,
            String description,
            String subject,
            String visibility
    ) {}

    public record AddCategoryRequest(
            @NotBlank(message = "Tên danh mục không được để trống") String name,
            String description,
            UUID parentId,
            Integer sortOrder
    ) {}

    public record UpdateCategoryRequest(
            String name,
            String description,
            Integer sortOrder
    ) {}

    public record MoveQuestionsRequest(
            @NotEmpty(message = "Danh sách câu hỏi không được để trống") List<UUID> questionIds,
            @NotNull(message = "Mã ngân hàng đích không được để trống") UUID targetBankId,
            UUID targetCategoryId
    ) {}

    public record CopyQuestionsRequest(
            @NotEmpty(message = "Danh sách câu hỏi không được để trống") List<UUID> questionIds,
            @NotNull(message = "Mã ngân hàng đích không được để trống") UUID targetBankId,
            UUID targetCategoryId
    ) {}

    // ============ Import/Export & Random Selection ============

    @PostMapping("/{bankId}/import")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Import questions from CSV file")
    public ResponseEntity<ApiResponse<QuestionImportExportUseCase.ImportResult>> importQuestions(
            @PathVariable UUID bankId,
            @AuthenticationPrincipal UserJpaEntity user,
            @RequestParam("file") MultipartFile file) {
        // P0: Verify teacher owns the target bank
        verifyBankOwnership(bankId, user);
        var result = importExportUseCase.importFromCsv(bankId, user.getId(), file);
        return ResponseEntity.ok(ApiResponse.success(result, "Đã nhập thành công " + result.imported() + " câu hỏi"));
    }

    @GetMapping("/{bankId}/export")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Export questions as CSV")
    public ResponseEntity<byte[]> exportQuestions(
            @PathVariable UUID bankId,
            @AuthenticationPrincipal UserJpaEntity user) {
        // P0: Verify teacher owns the bank
        verifyBankOwnership(bankId, user);
        byte[] csv = importExportUseCase.exportBankToCsv(bankId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=question_bank_" + bankId + ".csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv);
    }

    @GetMapping("/{bankId}/random")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')")
    @Operation(summary = "Get random questions from a bank")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getRandomQuestions(
            @PathVariable UUID bankId,
            @RequestParam(defaultValue = "10") int count,
            @AuthenticationPrincipal UserJpaEntity user) {
        // P0: Verify bank access (owner, admin, or PUBLIC)
        verifyBankAccess(bankId, user);
        List<QuestionJpaEntity> random = questionJpaRepository.findRandomByBankId(bankId, count);
        List<Map<String, Object>> result = random.stream().map(q -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", q.getId());
            map.put("questionType", q.getQuestionType());
            map.put("difficulty", q.getDifficulty());
            map.put("content", q.getContentBlocks());
            map.put("options", q.getOptions() != null ? q.getOptions().stream().map(o -> Map.of(
                    "id", o.getId(), "content", o.getContentBlocks(), "displayOrder", o.getOrderIndex()
            )).toList() : List.of());
            return map;
        }).toList();
        return ResponseEntity.ok(ApiResponse.success(result, "Lấy ngẫu nhiên " + random.size() + " câu hỏi"));
    }

    // ============ Response Mappers ============

    private Map<String, Object> toBankMap(QuestionBank bank) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", bank.getId().toString());
        map.put("name", bank.getName());
        map.put("description", bank.getDescription());
        map.put("subject", bank.getSubject());
        map.put("ownerId", bank.getOwnerId().toString());
        map.put("bankType", bank.getBankType().name());
        map.put("visibility", bank.getVisibility().name());
        map.put("status", bank.getStatus().name());
        map.put("questionCount", bank.getQuestionCount());
        map.put("createdAt", bank.getCreatedAt() != null ? bank.getCreatedAt().toString() : null);
        map.put("updatedAt", bank.getUpdatedAt() != null ? bank.getUpdatedAt().toString() : null);
        return map;
    }

    private Map<String, Object> toCategoryMap(QuestionBankCategory cat) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", cat.getId().toString());
        map.put("bankId", cat.getBankId().toString());
        map.put("parentId", cat.getParentId() != null ? cat.getParentId().toString() : null);
        map.put("name", cat.getName());
        map.put("description", cat.getDescription());
        map.put("sortOrder", cat.getSortOrder());
        map.put("questionCount", cat.getQuestionCount());
        return map;
    }

    private Map<String, Object> toCategoryTreeMap(QuestionBankCategory cat) {
        Map<String, Object> map = toCategoryMap(cat);
        if (cat.getChildren() != null && !cat.getChildren().isEmpty()) {
            map.put("children", cat.getChildren().stream().map(this::toCategoryTreeMap).toList());
        } else {
            map.put("children", List.of());
        }
        return map;
    }

    private Map<String, Object> toQuestionMap(Question q) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", q.getId().toString());
        map.put("questionType", q.getQuestionType() != null ? q.getQuestionType().name() : "SINGLE_CHOICE");
        map.put("difficulty", q.getDifficulty() != null ? q.getDifficulty().name() : "MEDIUM");
        map.put("tags", q.getTags());
        map.put("status", q.getStatus() != null ? q.getStatus().name() : "ACTIVE");
        map.put("categoryId", q.getCategoryId() != null ? q.getCategoryId().toString() : null);
        map.put("createdAt", q.getCreatedAt() != null ? q.getCreatedAt().toString() : null);
        // Extract text from content blocks
        if (q.getContentBlocks() != null && !q.getContentBlocks().isEmpty()) {
            StringBuilder sb = new StringBuilder();
            for (var block : q.getContentBlocks()) {
                if (block.getData() != null) {
                    Object text = block.getData().get("text");
                    if (text != null) {
                        if (!sb.isEmpty()) sb.append(" ");
                        sb.append(text);
                    }
                }
            }
            map.put("content", sb.toString());
        }
        return map;
    }

    private boolean isAdminRole(UserJpaEntity user) {
        return user.getRole() == UserJpaEntity.UserRole.ADMIN
            || user.getRole() == UserJpaEntity.UserRole.ORG_ADMIN;
    }

    /** P0: Verify bank read access — owner, admin, or PUBLIC visibility */
    private void verifyBankAccess(UUID bankId, UserJpaEntity user) {
        if (isAdminRole(user)) return;
        QuestionBank bank = useCase.getBankById(bankId);
        if (!bank.getOwnerId().equals(user.getId())
                && bank.getVisibility() != QuestionBank.Visibility.PUBLIC) {
            throw new org.springframework.security.access.AccessDeniedException("Bạn không có quyền truy cập ngân hàng câu hỏi này");
        }
    }

    /** P0: Verify bank write access — owner or admin only (PUBLIC not sufficient) */
    private void verifyBankOwnership(UUID bankId, UserJpaEntity user) {
        if (isAdminRole(user)) return;
        QuestionBank bank = useCase.getBankById(bankId);
        if (!bank.getOwnerId().equals(user.getId())) {
            throw new org.springframework.security.access.AccessDeniedException("Bạn không sở hữu ngân hàng câu hỏi này");
        }
    }
}

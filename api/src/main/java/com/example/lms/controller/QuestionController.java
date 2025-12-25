package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.dto.QuestionDTO;
import com.example.lms.dto.QuestionImportResultDTO;
import com.example.lms.entity.Question;
import com.example.lms.entity.User;
import com.example.lms.service.QuestionService;
import com.example.lms.service.QuestionImportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/questions")
@RequiredArgsConstructor
@Tag(name = "Question Bank Management", description = "API quản lý ngân hàng câu hỏi")
@SecurityRequirement(name = "Bearer Authentication")
public class QuestionController {

    private final QuestionService questionService;
    private final QuestionImportService questionImportService;

    @PostMapping
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Tạo câu hỏi mới", description = "Giảng viên tạo câu hỏi mới cho ngân hàng")
    public ResponseEntity<ApiResponse<QuestionDTO>> createQuestion(
            @AuthenticationPrincipal User currentUser,
            @RequestBody CreateQuestionRequest request
    ) {
        try {
            System.out.println("🔍 Create Question - User info:");
            System.out.println("   - User ID: " + currentUser.getId());
            
            // Call overloaded method with blocks support
            Question question = questionService.createQuestion(
                    currentUser,
                    request.getContent(),
                    request.getBlocks(), // Pass blocks
                    request.getCorrectOption(),
                    request.getOptions(),
                    request.getOptionBlocks(), // Pass option blocks
                    request.getDifficulty(),
                    request.getTags(),
                    request.getCourseId(),
                    request.getPackageId()
            );
            
            System.out.println("✅ Question created successfully: " + question.getId());
            
            QuestionDTO questionDTO = QuestionDTO.fromEntity(question);
            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(questionDTO));
        } catch (RuntimeException e) {
            System.out.println("❌ Error creating question: " + e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Lấy danh sách câu hỏi", description = "Lấy danh sách câu hỏi theo bộ lọc")
    public ResponseEntity<ApiResponse<List<QuestionDTO>>> getQuestions(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(required = false) Question.Status status,
            @RequestParam(required = false) Question.Difficulty difficulty,
            @RequestParam(required = false) String tags,
            @RequestHeader(value = "X-API-Version", required = false) String apiVersion
    ) {
        try {
            // Enhanced logging
            System.out.println("🔍 Question API - User info:");
            System.out.println("   - User ID: " + currentUser.getId());
            
            List<Question> questions;
            
            // Default: get all active questions for teachers/admins
            if (status == null && difficulty == null && (tags == null || tags.isEmpty())) {
                questions = questionService.getActiveQuestions();
            } else {
                Question.Status filterStatus = status != null ? status : Question.Status.ACTIVE;
                questions = questionService.searchQuestions(filterStatus, difficulty, tags);
            }
            
            System.out.println("📊 Found " + questions.size() + " questions");
            
            // Convert to DTOs
            boolean isV2 = "2.0".equals(apiVersion);
            List<QuestionDTO> questionDTOs = questions.stream()
                    .map(q -> {
                        QuestionDTO dto = QuestionDTO.fromEntity(q);
                        if (isV2) {
                            dto.setContent(null); // Save bandwidth for PWA
                            // Also clear options content?
                            if (dto.getOptions() != null) {
                                dto.getOptions().forEach(o -> o.setContent(null));
                            }
                        }
                        return dto;
                    })
                    .collect(Collectors.toList());
            
            return ResponseEntity.ok(ApiResponse.success(questionDTOs));
        } catch (RuntimeException e) {
            System.out.println("❌ Error in getQuestions: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }

    }

    @GetMapping("/my-questions")
    @PreAuthorize("hasRole('TEACHER')")
    @Operation(summary = "Lấy câu hỏi của tôi", description = "Lấy danh sách câu hỏi do giảng viên hiện tại tạo")
    public ResponseEntity<ApiResponse<List<QuestionDTO>>> getMyQuestions(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(required = false) Question.Status status
    ) {
        try {
            List<Question> questions = questionService.getQuestionsByCreator(currentUser, status);
            List<QuestionDTO> dtos = questions.stream().map(QuestionDTO::fromEntity).collect(Collectors.toList());
            return ResponseEntity.ok(ApiResponse.success(dtos));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật câu hỏi", description = "Giảng viên cập nhật câu hỏi của mình")
    public ResponseEntity<ApiResponse<QuestionDTO>> updateQuestion(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser,
            @RequestBody UpdateQuestionRequest request
    ) {
        try {
            // Call overloaded update method
            Question question = questionService.updateQuestion(
                    id,
                    request.getContent(),
                    request.getBlocks(),
                    request.getCorrectOption(),
                    request.getOptions(),
                    request.getOptionBlocks(),
                    request.getDifficulty(),
                    request.getTags(),
                    request.getStatus()
            );
            QuestionDTO questionDTO = QuestionDTO.fromEntity(question);
            return ResponseEntity.ok(ApiResponse.success(questionDTO));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Xóa câu hỏi", description = "Xóa câu hỏi (soft delete)")
    public ResponseEntity<ApiResponse<Void>> deleteQuestion(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            questionService.deleteQuestion(id, currentUser);
            return ResponseEntity.ok(ApiResponse.success(null));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Lấy chi tiết câu hỏi", description = "Lấy thông tin chi tiết của một câu hỏi để chỉnh sửa")
    public ResponseEntity<ApiResponse<QuestionDTO>> getQuestion(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            Question question = questionService.getQuestionById(id, currentUser);
            return ResponseEntity.ok(ApiResponse.success(QuestionDTO.fromEntity(question)));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(e.getMessage()));
        }
    }

    // DTOs
    public static class GetQuestionsByIdsRequest {
        private List<UUID> questionIds;

        public List<UUID> getQuestionIds() { return questionIds; }
        public void setQuestionIds(List<UUID> questionIds) { this.questionIds = questionIds; }
    }

    public static class CreateQuestionRequest {
        private String content;
        private List<com.example.lms.domain.ContentBlock> blocks; // New field
        
        private String correctOption;
        private List<String> options;
        private List<List<com.example.lms.domain.ContentBlock>> optionBlocks; // New field
        
        private Question.Difficulty difficulty;
        private String tags;
        private UUID courseId;
        private UUID packageId;

        // Getters and setters
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public List<com.example.lms.domain.ContentBlock> getBlocks() { return blocks; }
        public void setBlocks(List<com.example.lms.domain.ContentBlock> blocks) { this.blocks = blocks; }
        
        public String getCorrectOption() { return correctOption; }
        public void setCorrectOption(String correctOption) { this.correctOption = correctOption; }
        public List<String> getOptions() { return options; }
        public void setOptions(List<String> options) { this.options = options; }
        public List<List<com.example.lms.domain.ContentBlock>> getOptionBlocks() { return optionBlocks; }
        public void setOptionBlocks(List<List<com.example.lms.domain.ContentBlock>> optionBlocks) { this.optionBlocks = optionBlocks; }
        
        public Question.Difficulty getDifficulty() { return difficulty; }
        public void setDifficulty(Question.Difficulty difficulty) { this.difficulty = difficulty; }
        public String getTags() { return tags; }
        public void setTags(String tags) { this.tags = tags; }
        public UUID getCourseId() { return courseId; }
        public void setCourseId(UUID courseId) { this.courseId = courseId; }
        public UUID getPackageId() { return packageId; }
        public void setPackageId(UUID packageId) { this.packageId = packageId; }
    }

    public static class UpdateQuestionRequest {
        private String content;
        private List<com.example.lms.domain.ContentBlock> blocks;
        
        private String correctOption;
        private List<String> options;
        private List<List<com.example.lms.domain.ContentBlock>> optionBlocks;
        
        private Question.Difficulty difficulty;
        private String tags;
        private Question.Status status;

        // Getters and setters
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public List<com.example.lms.domain.ContentBlock> getBlocks() { return blocks; }
        public void setBlocks(List<com.example.lms.domain.ContentBlock> blocks) { this.blocks = blocks; }
        
        public String getCorrectOption() { return correctOption; }
        public void setCorrectOption(String correctOption) { this.correctOption = correctOption; }
        public List<String> getOptions() { return options; }
        public void setOptions(List<String> options) { this.options = options; }
        public List<List<com.example.lms.domain.ContentBlock>> getOptionBlocks() { return optionBlocks; }
        public void setOptionBlocks(List<List<com.example.lms.domain.ContentBlock>> optionBlocks) { this.optionBlocks = optionBlocks; }
        
        public Question.Difficulty getDifficulty() { return difficulty; }
        public void setDifficulty(Question.Difficulty difficulty) { this.difficulty = difficulty; }
        public String getTags() { return tags; }
        public void setTags(String tags) { this.tags = tags; }
        public Question.Status getStatus() { return status; }
        public void setStatus(Question.Status status) { this.status = status; }
    }

    // ==================== IMPORT ENDPOINTS ====================

    @PostMapping("/import/excel")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Import câu hỏi từ file Excel", 
               description = "Upload file Excel để import nhiều câu hỏi cùng lúc. Format: Câu hỏi | Đáp án A | Đáp án B | Đáp án C | Đáp án D | Đáp án đúng")
    public ResponseEntity<ApiResponse<QuestionImportResultDTO>> importFromExcel(
            @AuthenticationPrincipal User currentUser,
            @RequestParam("file") MultipartFile file,
            @RequestParam("packageId") UUID packageId,
            @RequestParam(value = "difficulty", defaultValue = "MEDIUM") Question.Difficulty difficulty
    ) {
        try {
            System.out.println("📥 Import Excel - User: " + currentUser.getUsername());
            System.out.println("   - Package ID: " + packageId);
            System.out.println("   - Difficulty: " + difficulty);
            System.out.println("   - File: " + file.getOriginalFilename() + " (" + file.getSize() + " bytes)");
            
            // Validate file type
            String filename = file.getOriginalFilename();
            if (filename == null || (!filename.endsWith(".xlsx") && !filename.endsWith(".xls"))) {
                return ResponseEntity.badRequest().body(
                    ApiResponse.error("File phải có định dạng Excel (.xlsx hoặc .xls)")
                );
            }
            
            QuestionImportService.ImportResult result = 
                questionImportService.importFromExcel(file, packageId, difficulty, currentUser);
            
            QuestionImportResultDTO dto = QuestionImportResultDTO.success(
                result.successCount, 
                result.failedCount, 
                result.errors
            );
            
            System.out.println("✅ Import completed: " + result.successCount + " success, " + result.failedCount + " failed");
            
            return ResponseEntity.ok(ApiResponse.success(dto));
        } catch (Exception e) {
            System.err.println("❌ Import failed: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(
                ApiResponse.error("Import thất bại: " + e.getMessage())
            );
        }
    }
}

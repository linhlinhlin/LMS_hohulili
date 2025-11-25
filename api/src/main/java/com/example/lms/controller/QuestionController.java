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
            System.out.println("   - Username: " + currentUser.getUsername());
            System.out.println("   - Role: " + currentUser.getRole().name());
            System.out.println("   - Course ID: " + request.getCourseId());
            System.out.println("   - Package ID: " + request.getPackageId());
            
            Question question = questionService.createQuestion(
                    currentUser,
                    request.getContent(),
                    request.getCorrectOption(),
                    request.getOptions(),
                    request.getDifficulty(),
                    request.getTags(),
                    request.getCourseId(),  // Add courseId parameter
                    request.getPackageId()  // Add packageId parameter
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
            @RequestParam(required = false) String tags
    ) {
        try {
            // Enhanced logging
            System.out.println("🔍 Question API - User info:");
            System.out.println("   - User ID: " + currentUser.getId());
            System.out.println("   - Username: " + currentUser.getUsername());
            System.out.println("   - Role: " + currentUser.getRole());
            System.out.println("   - Role name: " + currentUser.getRole().name());
            System.out.println("   - Enabled: " + currentUser.isEnabled());
            
            List<Question> questions;
            
            // Default: get all active questions for teachers/admins
            if (status == null && difficulty == null && (tags == null || tags.isEmpty())) {
                System.out.println("📋 Getting all active questions...");
                questions = questionService.getActiveQuestions();
            } else {
                System.out.println("🔍 Applying filters - Status: " + status + ", Difficulty: " + difficulty + ", Tags: " + tags);
                // Apply filters
                Question.Status filterStatus = status != null ? status : Question.Status.ACTIVE;
                questions = questionService.searchQuestions(filterStatus, difficulty, tags);
            }
            
            System.out.println("📊 Found " + questions.size() + " questions");
            
            // Convert to DTOs
            List<QuestionDTO> questionDTOs = questions.stream()
                    .map(QuestionDTO::fromEntity)
                    .collect(Collectors.toList());
            
            return ResponseEntity.ok(ApiResponse.success(questionDTOs));
        } catch (RuntimeException e) {
            System.out.println("❌ Error in getQuestions: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/my-questions")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Lấy câu hỏi của tôi", description = "Lấy danh sách câu hỏi do giảng viên hiện tại tạo")
    public ResponseEntity<ApiResponse<List<QuestionDTO>>> getMyQuestions(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(required = false) Question.Status status
    ) {
        try {
            List<Question> questions;
            // If caller provided a status filter, apply it. Otherwise, return all questions created by the user
            if (status == null) {
                System.out.println("🔍 getMyQuestions: no status provided - returning all questions created by user " + currentUser.getId());
                questions = questionService.getQuestionsByCreator(currentUser);
            } else {
                System.out.println("🔍 getMyQuestions: status=" + status + " - returning filtered list for user " + currentUser.getId());
                questions = questionService.getQuestionsByCreatorAndStatus(currentUser, status);
            }
            
            // Convert to DTOs
            List<QuestionDTO> questionDTOs = questions.stream()
                    .map(QuestionDTO::fromEntity)
                    .collect(Collectors.toList());
            
            System.out.println("✅ getMyQuestions: returning " + questionDTOs.size() + " questions as DTOs");
            return ResponseEntity.ok(ApiResponse.success(questionDTOs));
        } catch (RuntimeException e) {
            System.out.println("❌ Error in getMyQuestions: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết câu hỏi", description = "Lấy thông tin chi tiết của một câu hỏi")
    public ResponseEntity<ApiResponse<QuestionDTO>> getQuestion(@PathVariable UUID id) {
        try {
            Question question = questionService.getQuestionById(id);
            QuestionDTO questionDTO = QuestionDTO.fromEntity(question);
            return ResponseEntity.ok(ApiResponse.success(questionDTO));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Câu hỏi không tồn tại"));
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
            Question question = questionService.updateQuestion(
                    id,
                    request.getContent(),
                    request.getCorrectOption(),
                    request.getOptions(),
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
    @Operation(summary = "Xóa câu hỏi", description = "Giảng viên xóa câu hỏi của mình")
    public ResponseEntity<ApiResponse<String>> deleteQuestion(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            questionService.deleteQuestion(id, currentUser);
            return ResponseEntity.ok(ApiResponse.success("Câu hỏi đã được xóa"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/course/{courseId}")
    @Operation(summary = "Lấy tất cả câu hỏi theo khóa học", 
               description = "Teacher lấy tất cả câu hỏi có thể sử dụng cho quiz trong khóa học")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<QuestionDTO>>> getQuestionsByCourse(
            @PathVariable UUID courseId,
            @RequestParam(defaultValue = "ACTIVE") String status,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            System.out.println("🔍 Getting questions for course: " + courseId + " with status: " + status);
            
            List<Question> questions = questionService.getQuestionsByCourse(courseId, status, currentUser);
            
            List<QuestionDTO> questionDTOs = questions.stream()
                    .map(QuestionDTO::fromEntity)
                    .collect(Collectors.toList());
                    
            System.out.println("✅ Found " + questionDTOs.size() + " questions for course " + courseId);
            return ResponseEntity.ok(ApiResponse.success(questionDTOs));
        } catch (RuntimeException e) {
            System.err.println("❌ Error getting questions by course: " + e.getMessage());
            String msg = e.getMessage() != null ? e.getMessage() : "Không thể lấy danh sách câu hỏi";
            if (msg.toLowerCase().contains("quyền")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error(msg));
            }
            return ResponseEntity.badRequest().body(ApiResponse.error(msg));
        }
    }

    @PostMapping("/by-ids")
    @Operation(summary = "Lấy câu hỏi theo danh sách IDs", description = "Lấy nhiều câu hỏi dựa trên list IDs")
    public ResponseEntity<ApiResponse<List<QuestionDTO>>> getQuestionsByIds(
            @RequestBody GetQuestionsByIdsRequest request
    ) {
        try {
            List<Question> questions = questionService.getQuestionsByIds(request.getQuestionIds());
            List<QuestionDTO> questionDTOs = questions.stream()
                    .map(QuestionDTO::fromEntity)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(ApiResponse.success(questionDTOs));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/course/{courseId}/all")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Lấy tất cả câu hỏi theo khóa học", description = "Lấy tất cả câu hỏi thuộc về khóa học cụ thể")
    public ResponseEntity<ApiResponse<List<QuestionDTO>>> getAllQuestionsByCourse(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID courseId,
            @RequestParam(required = false) Question.Status status
    ) {
        try {
            List<Question> questions;
            
            // If status filter is provided, use it. Otherwise return all questions
            if (status == null) {
                questions = questionService.getQuestionsByCourse(courseId);
            } else {
                questions = questionService.getQuestionsByCourseAndStatus(courseId, status);
            }
            
            // Convert to DTOs
            List<QuestionDTO> questionDTOs = questions.stream()
                    .map(QuestionDTO::fromEntity)
                    .collect(Collectors.toList());
            
            return ResponseEntity.ok(ApiResponse.success(questionDTOs));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/course/{courseId}/user")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    @Operation(summary = "Lấy câu hỏi của tôi trong khóa học", description = "Lấy câu hỏi mà giảng viên hiện tại đã tạo cho khóa học cụ thể")
    public ResponseEntity<ApiResponse<List<QuestionDTO>>> getMyQuestionsInCourse(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID courseId,
            @RequestParam(required = false) Question.Status status
    ) {
        try {
            List<Question> questions;
            
            // If status filter is provided, use it. Otherwise return all questions
            if (status == null) {
                questions = questionService.getQuestionsByCourseAndUser(courseId, currentUser.getId());
            } else {
                questions = questionService.getQuestionsByCourseAndStatus(courseId, status);
            }
            
            // Convert to DTOs
            List<QuestionDTO> questionDTOs = questions.stream()
                    .map(QuestionDTO::fromEntity)
                    .collect(Collectors.toList());
            
            return ResponseEntity.ok(ApiResponse.success(questionDTOs));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
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
        private String correctOption;
        private List<String> options;
        private Question.Difficulty difficulty;
        private String tags;
        private UUID courseId;  // Add courseId field
        private UUID packageId;  // Add packageId field

        // Getters and setters
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public String getCorrectOption() { return correctOption; }
        public void setCorrectOption(String correctOption) { this.correctOption = correctOption; }
        public List<String> getOptions() { return options; }
        public void setOptions(List<String> options) { this.options = options; }
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
        private String correctOption;
        private List<String> options;
        private Question.Difficulty difficulty;
        private String tags;
        private Question.Status status;

        // Getters and setters
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public String getCorrectOption() { return correctOption; }
        public void setCorrectOption(String correctOption) { this.correctOption = correctOption; }
        public List<String> getOptions() { return options; }
        public void setOptions(List<String> options) { this.options = options; }
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
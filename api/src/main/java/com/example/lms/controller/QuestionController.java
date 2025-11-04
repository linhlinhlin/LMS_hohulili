package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.entity.Question;
import com.example.lms.entity.User;
import com.example.lms.service.QuestionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/questions")
@RequiredArgsConstructor
@Tag(name = "Question Bank Management", description = "API quản lý ngân hàng câu hỏi")
@SecurityRequirement(name = "Bearer Authentication")
public class QuestionController {

    private final QuestionService questionService;

    @PostMapping
    @Operation(summary = "Tạo câu hỏi mới", description = "Giảng viên tạo câu hỏi mới cho ngân hàng")
    public ResponseEntity<ApiResponse<Question>> createQuestion(
            @AuthenticationPrincipal User currentUser,
            @RequestBody CreateQuestionRequest request
    ) {
        try {
            Question question = questionService.createQuestion(
                    currentUser,
                    request.getContent(),
                    request.getCorrectOption(),
                    request.getOptions(),
                    request.getDifficulty(),
                    request.getTags()
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(question));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping
    @Operation(summary = "Lấy danh sách câu hỏi", description = "Lấy danh sách câu hỏi theo bộ lọc")
    public ResponseEntity<ApiResponse<List<Question>>> getQuestions(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(required = false) Question.Status status,
            @RequestParam(required = false) Question.Difficulty difficulty,
            @RequestParam(required = false) String tags
    ) {
        try {
            List<Question> questions;
            if (status == null) {
                questions = questionService.getQuestionsByCreatorAndStatus(currentUser, Question.Status.ACTIVE);
            } else {
                questions = questionService.searchQuestions(status, difficulty, tags);
            }
            return ResponseEntity.ok(ApiResponse.success(questions));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết câu hỏi", description = "Lấy thông tin chi tiết của một câu hỏi")
    public ResponseEntity<ApiResponse<Question>> getQuestion(@PathVariable UUID id) {
        try {
            Question question = questionService.getQuestionById(id);
            return ResponseEntity.ok(ApiResponse.success(question));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Câu hỏi không tồn tại"));
        }
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật câu hỏi", description = "Giảng viên cập nhật câu hỏi của mình")
    public ResponseEntity<ApiResponse<Question>> updateQuestion(
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
            return ResponseEntity.ok(ApiResponse.success(question));
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

    @PostMapping("/by-ids")
    @Operation(summary = "Lấy câu hỏi theo danh sách IDs", description = "Lấy nhiều câu hỏi dựa trên list IDs")
    public ResponseEntity<ApiResponse<List<Question>>> getQuestionsByIds(
            @RequestBody GetQuestionsByIdsRequest request
    ) {
        try {
            List<Question> questions = questionService.getQuestionsByIds(request.getQuestionIds());
            return ResponseEntity.ok(ApiResponse.success(questions));
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

        // Getters and setters
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public String getCorrectOption() { return correctOption; }
        public void setCorrectOption(String correctOption) { this.correctOption = correctOption; }
        public List<String> options() { return options; }
        public void setOptions(List<String> options) { this.options = options; }
        public Question.Difficulty getDifficulty() { return difficulty; }
        public void setDifficulty(Question.Difficulty difficulty) { this.difficulty = difficulty; }
        public String getTags() { return tags; }
        public void setTags(String tags) { this.tags = tags; }
        public List<String> getOptions() { return options; }
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
}
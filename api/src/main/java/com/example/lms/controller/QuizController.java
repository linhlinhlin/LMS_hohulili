package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.entity.*;
import com.example.lms.service.QuizService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/quizzes")
@RequiredArgsConstructor
@Tag(name = "Quiz Management", description = "API quản lý quiz và attempt")
@SecurityRequirement(name = "Bearer Authentication")
public class QuizController {

    private final QuizService quizService;

    @PostMapping("/lessons/{lessonId}")
    @Operation(summary = "Tạo quiz cho lesson", description = "Giảng viên tạo quiz cho lesson")
    public ResponseEntity<ApiResponse<Quiz>> createQuiz(
            @PathVariable UUID lessonId,
            @AuthenticationPrincipal User currentUser,
            @RequestBody CreateQuizRequest request
    ) {
        try {
            // TODO: Get lesson and check permissions
            Lesson lesson = new Lesson(); // Placeholder
            lesson.setId(lessonId);

            Quiz quiz = quizService.createQuiz(
                    lesson,
                    request.getQuestionIds(),
                    request.getTimeLimitMinutes(),
                    request.getMaxAttempts(),
                    request.getPassingScore(),
                    request.getShuffleQuestions(),
                    request.getShuffleOptions(),
                    request.getShowResultsImmediately(),
                    request.getShowCorrectAnswers(),
                    request.getStartDate(),
                    request.getEndDate()
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(quiz));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/{lessonId}/attempts")
    @Operation(summary = "Bắt đầu làm quiz", description = "Học viên bắt đầu làm quiz")
    public ResponseEntity<ApiResponse<QuizAttempt>> startAttempt(
            @PathVariable UUID lessonId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            QuizAttempt attempt = quizService.startAttempt(currentUser, lessonId);
            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(attempt));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/lessons/{lessonId}")
    @Operation(summary = "Lấy thông tin quiz", description = "Lấy quiz theo lesson ID")
    public ResponseEntity<ApiResponse<Quiz>> getQuizByLessonId(@PathVariable UUID lessonId) {
        try {
            Quiz quiz = quizService.getQuizByLessonId(lessonId);
            return ResponseEntity.ok(ApiResponse.success(quiz));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/lessons/{lessonId}/questions")
    @Operation(summary = "Lấy danh sách câu hỏi của quiz", description = "Lấy tất cả câu hỏi trong quiz")
    public ResponseEntity<ApiResponse<List<Question>>> getQuizQuestions(@PathVariable UUID lessonId) {
        try {
            List<Question> questions = quizService.getQuizQuestions(lessonId);
            return ResponseEntity.ok(ApiResponse.success(questions));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/attempts/{attemptId}/submit")
    @Operation(summary = "Nộp bài quiz", description = "Học viên nộp bài quiz")
    public ResponseEntity<ApiResponse<QuizAttempt>> submitAttempt(
            @PathVariable UUID attemptId,
            @RequestBody SubmitAttemptRequest request
    ) {
        try {
            QuizAttempt attempt = quizService.submitAttempt(attemptId, request.getAnswers());
            return ResponseEntity.ok(ApiResponse.success(attempt));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/{lessonId}/attempts")
    @Operation(summary = "Lấy danh sách attempts của học viên", description = "Học viên xem danh sách attempts của mình")
    public ResponseEntity<ApiResponse<List<QuizAttempt>>> getStudentAttempts(
            @PathVariable UUID lessonId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            Quiz quiz = quizService.getQuizByLessonId(lessonId);
            List<QuizAttempt> attempts = quizService.getStudentAttempts(quiz.getId(), currentUser.getId());
            return ResponseEntity.ok(ApiResponse.success(attempts));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/lessons/{lessonId}/attempts")
    @Operation(summary = "Lấy danh sách tất cả attempts", description = "Giảng viên xem tất cả attempts của quiz")
    public ResponseEntity<ApiResponse<List<QuizAttempt>>> getQuizAttempts(
            @PathVariable UUID lessonId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            Quiz quiz = quizService.getQuizByLessonId(lessonId);
            List<QuizAttempt> attempts = quizService.getQuizAttempts(quiz.getId());
            return ResponseEntity.ok(ApiResponse.success(attempts));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    // DTOs
    public static class CreateQuizRequest {
        private List<UUID> questionIds;
        private Integer timeLimitMinutes;
        private Integer maxAttempts;
        private Integer passingScore;
        private Boolean shuffleQuestions;
        private Boolean shuffleOptions;
        private Boolean showResultsImmediately;
        private Boolean showCorrectAnswers;
        private Instant startDate;
        private Instant endDate;

        // Getters and setters
        public List<UUID> getQuestionIds() { return questionIds; }
        public void setQuestionIds(List<UUID> questionIds) { this.questionIds = questionIds; }
        public Integer getTimeLimitMinutes() { return timeLimitMinutes; }
        public void setTimeLimitMinutes(Integer timeLimitMinutes) { this.timeLimitMinutes = timeLimitMinutes; }
        public Integer getMaxAttempts() { return maxAttempts; }
        public void setMaxAttempts(Integer maxAttempts) { this.maxAttempts = maxAttempts; }
        public Integer getPassingScore() { return passingScore; }
        public void setPassingScore(Integer passingScore) { this.passingScore = passingScore; }
        public Boolean getShuffleQuestions() { return shuffleQuestions; }
        public void setShuffleQuestions(Boolean shuffleQuestions) { this.shuffleQuestions = shuffleQuestions; }
        public Boolean getShuffleOptions() { return shuffleOptions; }
        public void setShuffleOptions(Boolean shuffleOptions) { this.shuffleOptions = shuffleOptions; }
        public Boolean getShowResultsImmediately() { return showResultsImmediately; }
        public void setShowResultsImmediately(Boolean showResultsImmediately) { this.showResultsImmediately = showResultsImmediately; }
        public Boolean getShowCorrectAnswers() { return showCorrectAnswers; }
        public void setShowCorrectAnswers(Boolean showCorrectAnswers) { this.showCorrectAnswers = showCorrectAnswers; }
        public Instant getStartDate() { return startDate; }
        public void setStartDate(Instant startDate) { this.startDate = startDate; }
        public Instant getEndDate() { return endDate; }
        public void setEndDate(Instant endDate) { this.endDate = endDate; }
    }

    public static class SubmitAttemptRequest {
        private Map<UUID, String> answers;

        public Map<UUID, String> getAnswers() { return answers; }
        public void setAnswers(Map<UUID, String> answers) { this.answers = answers; }
    }

    @PutMapping("/lessons/{lessonId}/questions")
    public ResponseEntity<?> updateQuizQuestions(
            @PathVariable UUID lessonId,
            @RequestBody UpdateQuizQuestionsRequest request) {
        try {
            Quiz quiz = quizService.updateQuizQuestions(lessonId, request.getQuestionIds());
            return ResponseEntity.ok(ApiResponse.success(quiz, "Cập nhật danh sách câu hỏi thành công"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    public static class UpdateQuizQuestionsRequest {
        private List<UUID> questionIds;

        public List<UUID> getQuestionIds() { return questionIds; }
        public void setQuestionIds(List<UUID> questionIds) { this.questionIds = questionIds; }
    }
}
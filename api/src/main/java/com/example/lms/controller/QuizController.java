package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.dto.QuizDTO;
import com.example.lms.entity.*;
import com.example.lms.service.LessonService;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/quizzes")
@RequiredArgsConstructor
@Tag(name = "Quiz Management", description = "API quản lý quiz và attempt")
@SecurityRequirement(name = "Bearer Authentication")
public class QuizController {

    private final QuizService quizService;
    private final LessonService lessonService;

    @PostMapping("/lessons/{lessonId}")
    @Operation(summary = "Tạo quiz cho lesson", description = "Giảng viên tạo quiz cho lesson")
    public ResponseEntity<ApiResponse<Quiz>> createQuiz(
            @PathVariable UUID lessonId,
            @AuthenticationPrincipal User currentUser,
            @RequestBody CreateQuizRequest request
    ) {
        try {
            // Get and validate lesson
            Lesson lesson = lessonService.getLessonById(lessonId, currentUser);

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
            System.err.println("❌ Quiz creation failed: " + e.getMessage());
            e.printStackTrace();
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
            // Validate lesson access first
            lessonService.getLessonById(lessonId, currentUser);
            
            QuizAttempt attempt = quizService.startAttempt(currentUser, lessonId);
            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(attempt));
        } catch (RuntimeException e) {
            System.err.println("❌ Start attempt failed: " + e.getMessage());
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
            System.err.println("❌ Get quiz by lesson failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/lessons/{lessonId}/questions")
    @Operation(summary = "Lấy danh sách câu hỏi của quiz", description = "Lấy tất cả câu hỏi trong quiz")
    public ResponseEntity<ApiResponse<List<Question>>> getQuizQuestions(@PathVariable UUID lessonId) {
        try {
            System.out.println("🔍 DEBUG: Getting questions for lesson: " + lessonId);
            
            // Check if quiz exists for this lesson
            Quiz quiz = quizService.getQuizByLessonId(lessonId);
            System.out.println("🔍 DEBUG: Found quiz: " + quiz.getId());
            
            List<Question> questions = quizService.getQuizQuestions(lessonId);
            System.out.println("🔍 DEBUG: Retrieved " + questions.size() + " questions");
            
            return ResponseEntity.ok(ApiResponse.success(questions));
        } catch (RuntimeException e) {
            System.err.println("❌ Get quiz questions failed: " + e.getMessage());
            e.printStackTrace();
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
            // Validate lesson access first
            lessonService.getLessonById(lessonId, currentUser);
            
            Quiz quiz = quizService.getQuizByLessonId(lessonId);
            List<QuizAttempt> attempts = quizService.getStudentAttempts(quiz.getId(), currentUser.getId());
            return ResponseEntity.ok(ApiResponse.success(attempts));
        } catch (RuntimeException e) {
            System.err.println("❌ Get student attempts failed: " + e.getMessage());
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
            // Validate lesson access first
            lessonService.getLessonById(lessonId, currentUser);
            
            Quiz quiz = quizService.getQuizByLessonId(lessonId);
            List<QuizAttempt> attempts = quizService.getQuizAttempts(quiz.getId());
            return ResponseEntity.ok(ApiResponse.success(attempts));
        } catch (RuntimeException e) {
            System.err.println("❌ Get quiz attempts failed: " + e.getMessage());
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
            @RequestBody UpdateQuizQuestionsRequest request,
            @AuthenticationPrincipal User currentUser) {
        try {
            // Validate lesson access first
            lessonService.getLessonById(lessonId, currentUser);
            
            Quiz quiz = quizService.updateQuizQuestions(lessonId, request.getQuestionIds());
            return ResponseEntity.ok(ApiResponse.success(quiz, "Cập nhật danh sách câu hỏi thành công"));
        } catch (Exception e) {
            System.err.println("❌ Update quiz questions failed: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    public static class UpdateQuizQuestionsRequest {
        private List<UUID> questionIds;

        public List<UUID> getQuestionIds() { return questionIds; }
        public void setQuestionIds(List<UUID> questionIds) { this.questionIds = questionIds; }
    }

    @GetMapping("/attempts/{attemptId}/result")
    @Operation(summary = "Xem kết quả chi tiết của quiz", description = "Học viên xem kết quả với đáp án đúng/sai")
    public ResponseEntity<ApiResponse<QuizService.QuizResultDetail>> getQuizResult(
            @PathVariable UUID attemptId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            QuizService.QuizResultDetail result = quizService.getQuizResult(attemptId, currentUser.getId());
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (RuntimeException e) {
            System.err.println("❌ Get quiz result failed: " + e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/lessons/{lessonId}/statistics")
    @Operation(summary = "Xem thống kê quiz", description = "Giảng viên xem thống kê kết quả quiz")
    public ResponseEntity<ApiResponse<QuizService.QuizStatistics>> getQuizStatistics(
            @PathVariable UUID lessonId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            // Validate lesson access first
            lessonService.getLessonById(lessonId, currentUser);
            
            QuizService.QuizStatistics statistics = quizService.getQuizStatistics(lessonId);
            return ResponseEntity.ok(ApiResponse.success(statistics));
        } catch (RuntimeException e) {
            System.err.println("❌ Get quiz statistics failed: " + e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/teacher/quizzes")
    @Operation(summary = "Lấy tất cả quiz của giảng viên", description = "Giảng viên xem danh sách tất cả quiz đã tạo")
    public ResponseEntity<ApiResponse<List<QuizDTO>>> getTeacherQuizzes(
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            System.out.println("🔍 Getting teacher quizzes for user: " + currentUser.getId());
            List<QuizDTO> quizzes = quizService.getQuizDTOsByInstructorId(currentUser.getId());
            System.out.println("📊 Found " + quizzes.size() + " quizzes for teacher");
            return ResponseEntity.ok(ApiResponse.success(quizzes));
        } catch (RuntimeException e) {
            System.err.println("❌ Get teacher quizzes failed: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/lessons/{lessonId}/debug")
    @Operation(summary = "Debug quiz info", description = "Debug thông tin quiz và câu hỏi")
    public ResponseEntity<ApiResponse<Map<String, Object>>> debugQuizInfo(@PathVariable UUID lessonId) {
        try {
            Quiz quiz = quizService.getQuizByLessonId(lessonId);
            List<Question> questions = quizService.getQuizQuestions(lessonId);
            
            Map<String, Object> debugInfo = new HashMap<>();
            debugInfo.put("quizId", quiz.getId());
            debugInfo.put("lessonId", lessonId);
            debugInfo.put("questionIdsJson", quiz.getQuestionIds());
            debugInfo.put("questionsCount", questions.size());
            debugInfo.put("questionDetails", questions.stream().map(q -> {
                Map<String, Object> qInfo = new HashMap<>();
                qInfo.put("id", q.getId());
                qInfo.put("content", q.getContent());
                return qInfo;
            }).collect(Collectors.toList()));
            
            return ResponseEntity.ok(ApiResponse.success(debugInfo));
        } catch (RuntimeException e) {
            System.err.println("❌ Debug quiz info failed: " + e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/lessons/{lessonId}/questions/add")
    @Operation(summary = "Thêm câu hỏi vào quiz", description = "Thêm một câu hỏi vào quiz hiện tại")
    public ResponseEntity<ApiResponse<Quiz>> addQuestionToQuiz(
            @PathVariable UUID lessonId,
            @RequestBody AddQuestionToQuizRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            // Validate lesson access first
            lessonService.getLessonById(lessonId, currentUser);
            
            Quiz quiz = quizService.addQuestionToQuiz(lessonId, request.getQuestionId());
            return ResponseEntity.ok(ApiResponse.success(quiz, "Đã thêm câu hỏi vào quiz"));
        } catch (RuntimeException e) {
            System.err.println("❌ Add question to quiz failed: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    public static class AddQuestionToQuizRequest {
        private UUID questionId;

        public UUID getQuestionId() { return questionId; }
        public void setQuestionId(UUID questionId) { this.questionId = questionId; }
    }

    @DeleteMapping("/lessons/{lessonId}/questions/{questionId}")
    @Operation(summary = "Xóa câu hỏi khỏi quiz", description = "Xóa một câu hỏi khỏi quiz hiện tại")
    public ResponseEntity<ApiResponse<Quiz>> removeQuestionFromQuiz(
            @PathVariable UUID lessonId,
            @PathVariable UUID questionId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            // Validate lesson access first
            lessonService.getLessonById(lessonId, currentUser);
            
            Quiz quiz = quizService.removeQuestionFromQuiz(lessonId, questionId);
            return ResponseEntity.ok(ApiResponse.success(quiz, "Đã xóa câu hỏi khỏi quiz"));
        } catch (RuntimeException e) {
            System.err.println("❌ Remove question from quiz failed: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/lessons/{lessonId}")
    @Operation(summary = "Xóa toàn bộ quiz", description = "Xóa quiz và tất cả câu hỏi liên quan")
    public ResponseEntity<ApiResponse<String>> deleteQuiz(
            @PathVariable UUID lessonId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            // Validate lesson access first
            lessonService.getLessonById(lessonId, currentUser);
            
            quizService.deleteQuizWithAllQuestions(lessonId);
            return ResponseEntity.ok(ApiResponse.success("Đã xóa quiz thành công", "Đã xóa quiz và tất cả câu hỏi"));
        } catch (RuntimeException e) {
            System.err.println("❌ Delete quiz failed: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
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
import java.util.ArrayList;
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
            
            // Check if quiz exists for this lesson - return empty list if not
            try {
                Quiz quiz = quizService.getQuizByLessonId(lessonId);
                System.out.println("🔍 DEBUG: Found quiz: " + quiz.getId());
                
                List<Question> questions = quizService.getQuizQuestions(lessonId);
                System.out.println("🔍 DEBUG: Retrieved " + questions.size() + " questions");
                
                return ResponseEntity.ok(ApiResponse.success(questions));
            } catch (RuntimeException e) {
                if (e.getMessage() != null && e.getMessage().contains("Quiz not found")) {
                    System.out.println("⚠️ Quiz not found for lesson: " + lessonId + ". Returning empty list.");
                    return ResponseEntity.ok(ApiResponse.success(new ArrayList<>()));
                }
                throw e;
            }
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

    @GetMapping("/available-questions")
    @Operation(summary = "Lấy danh sách câu hỏi có sẵn", description = "Lấy tất cả câu hỏi có sẵn để thêm vào quiz")
    public ResponseEntity<ApiResponse<List<Question>>> getAvailableQuestions(
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            System.out.println("🔍 Getting available questions for teacher: " + currentUser.getId());
            List<Question> questions = quizService.getAvailableQuestions(currentUser.getId());
            System.out.println("📊 Found " + questions.size() + " available questions");
            return ResponseEntity.ok(ApiResponse.success(questions));
        } catch (RuntimeException e) {
            System.err.println("❌ Get available questions failed: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/lessons/{lessonId}/auto-populate-questions")
    @Operation(summary = "Tự động thêm câu hỏi mẫu vào quiz", description = "Thêm các câu hỏi mẫu vào quiz để test")
    public ResponseEntity<ApiResponse<Map<String, Object>>> autoPopulateQuizQuestions(
            @PathVariable UUID lessonId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            System.out.println("🔍 Auto-populating quiz questions for lesson: " + lessonId);
            
            // Validate lesson access first
            lessonService.getLessonById(lessonId, currentUser);
            
            Map<String, Object> result = quizService.autoPopulateQuizQuestions(lessonId, currentUser.getId());
            System.out.println("✅ Auto-populated quiz questions: " + result);
            
            return ResponseEntity.ok(ApiResponse.success(result, "Đã thêm câu hỏi vào quiz"));
        } catch (RuntimeException e) {
            System.err.println("❌ Auto-populate quiz questions failed: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/lessons/{lessonId}/create-sample-questions")
    @Operation(summary = "Tạo câu hỏi mẫu", description = "Tạo một số câu hỏi mẫu cho quiz")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createSampleQuestions(
            @PathVariable UUID lessonId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            System.out.println("🔍 Creating sample questions for lesson: " + lessonId);
            
            // Validate lesson access first
            Lesson lesson = lessonService.getLessonById(lessonId, currentUser);
            
            Map<String, Object> result = quizService.createSampleQuestions(lesson, currentUser);
            System.out.println("✅ Created sample questions: " + result);
            
            return ResponseEntity.ok(ApiResponse.success(result, "Đã tạo câu hỏi mẫu"));
        } catch (RuntimeException e) {
            System.err.println("❌ Create sample questions failed: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/lessons/{lessonId}/questions/add")
    @Operation(summary = "Thêm câu hỏi vào quiz", description = "Thêm một câu hỏi vào quiz hiện tại")
    public ResponseEntity<?> addQuestionToQuiz(
            @PathVariable UUID lessonId,
            @RequestBody(required = false) AddQuestionToQuizRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            System.out.println("========================================");
            System.out.println("🔍 addQuestionToQuiz endpoint called");
            System.out.println("   lessonId: " + lessonId);
            System.out.println("   request object: " + request);
            System.out.println("   questionId from request: " + (request != null ? request.getQuestionId() : "REQUEST IS NULL"));
            System.out.println("   currentUser: " + (currentUser != null ? currentUser.getId() + " (" + currentUser.getEmail() + ")" : "null"));
            System.out.println("========================================");
            
            if (request == null) {
                System.err.println("❌ Request body is null! Check Content-Type header.");
                return ResponseEntity.badRequest().body(ApiResponse.error("Request body is required. Make sure Content-Type is application/json"));
            }
            
            if (request.getQuestionId() == null || request.getQuestionId().isEmpty()) {
                System.err.println("❌ questionId is null or empty!");
                return ResponseEntity.badRequest().body(ApiResponse.error("questionId is required"));
            }
            
            UUID questionUUID;
            try {
                questionUUID = request.getQuestionIdAsUUID();
                System.out.println("✅ Parsed questionId: " + questionUUID);
            } catch (IllegalArgumentException e) {
                System.err.println("❌ Invalid questionId format: " + request.getQuestionId());
                return ResponseEntity.badRequest().body(ApiResponse.error("Invalid questionId format: " + request.getQuestionId()));
            }
            
            // Validate lesson access first
            System.out.println("🔍 Validating lesson access...");
            lessonService.getLessonById(lessonId, currentUser);
            System.out.println("✅ Lesson access validated");
            
            System.out.println("🔍 Adding question to quiz...");
            Quiz quiz = quizService.addQuestionToQuiz(lessonId, questionUUID);
            System.out.println("✅ Question added to quiz: " + quiz.getId());
            
            // Return simple response to avoid serialization issues
            Map<String, Object> response = new HashMap<>();
            response.put("quizId", quiz.getId());
            response.put("message", "Đã thêm câu hỏi vào quiz");
            response.put("questionCount", quizService.getQuizQuestionCount(quiz.getId()));
            
            System.out.println("✅ Returning success response");
            return ResponseEntity.ok(ApiResponse.success(response, "Đã thêm câu hỏi vào quiz"));
        } catch (RuntimeException e) {
            System.err.println("❌ Add question to quiz failed: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    public static class AddQuestionToQuizRequest {
        @com.fasterxml.jackson.annotation.JsonProperty("questionId")
        private String questionId; // Accept as String, parse to UUID in controller

        public AddQuestionToQuizRequest() {} // Default constructor for JSON deserialization
        
        public String getQuestionId() { return questionId; }
        public void setQuestionId(String questionId) { this.questionId = questionId; }
        
        public UUID getQuestionIdAsUUID() {
            return questionId != null ? UUID.fromString(questionId) : null;
        }
        
        @Override
        public String toString() {
            return "AddQuestionToQuizRequest{questionId=" + questionId + "}";
        }
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

    @PutMapping("/{quizId}/settings")
    @Operation(summary = "Cập nhật cấu hình quiz", description = "Giảng viên cập nhật settings của quiz")
    public ResponseEntity<ApiResponse<Quiz>> updateQuizSettings(
            @PathVariable UUID quizId,
            @AuthenticationPrincipal User currentUser,
            @RequestBody com.example.lms.dto.UpdateQuizSettingsRequest request
    ) {
        try {
            Quiz quiz = quizService.updateQuizSettings(
                    quizId,
                    request.getTitle(),
                    request.getTimeLimitMinutes(),
                    request.getMaxAttempts(),
                    request.getPassingScore(),
                    request.getShuffleQuestions(),
                    request.getShuffleOptions(),
                    request.getShowResultsImmediately(),
                    request.getShowCorrectAnswers()
            );
            return ResponseEntity.ok(ApiResponse.success(quiz));
        } catch (RuntimeException e) {
            System.err.println("❌ Update quiz settings failed: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/admin/cleanup-duplicates")
    @Operation(summary = "Cleanup duplicate quizzes", description = "Admin endpoint to clean up duplicate quizzes for the same lesson")
    public ResponseEntity<ApiResponse<Map<String, Object>>> cleanupDuplicateQuizzes(
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            System.out.println("🧹 Cleanup duplicate quizzes requested by user: " + currentUser.getId());
            Map<String, Object> result = quizService.cleanupDuplicateQuizzes();
            System.out.println("✅ Cleanup completed: " + result);
            return ResponseEntity.ok(ApiResponse.success(result, "Cleanup completed"));
        } catch (RuntimeException e) {
            System.err.println("❌ Cleanup duplicate quizzes failed: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}

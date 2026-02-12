package com.example.lms.ai_assistant.infrastructure.web;

import com.example.lms.ai_assistant.application.dto.ChatSessionResponse;
import com.example.lms.ai_assistant.application.dto.CreateChatSessionCommand;
import com.example.lms.ai_assistant.application.dto.SendChatMessageCommand;
import com.example.lms.ai_assistant.application.usecase.ChatSessionUseCaseV3;
import com.example.lms.ai_assistant.infrastructure.persistence.ChatMessageJpaRepository;
import com.example.lms.ai_assistant.infrastructure.persistence.entity.ChatMessageJpaEntity;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

/**
 * REST Controller for AI Assistant functionality.
 * MVP: Uses template-based responses (no external AI API required).
 */
@RestController
@RequestMapping("/api/v3/ai")
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
@Tag(name = "AI Assistant", description = "AI-powered chat and assistance APIs")
@SecurityRequirement(name = "bearerAuth")
public class AiAssistantControllerV3 {

    private static final Logger log = LoggerFactory.getLogger(AiAssistantControllerV3.class);

    private final ChatSessionUseCaseV3 chatSessionUseCase;
    private final ChatMessageJpaRepository chatMessageRepository;

    // ============== Health Check ==============

    @GetMapping("/health")
    @PreAuthorize("permitAll()")
    @Operation(summary = "Check AI service health status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> healthCheck() {
        Map<String, Object> health = Map.of(
            "status", "healthy",
            "aiServiceStatus", "available",
            "version", "3.0"
        );
        return ResponseEntity.ok(ApiResponse.success(health, "AI service is healthy"));
    }

    // ============== Session Management ==============

    @PostMapping("/sessions")
    @Operation(summary = "Create a new chat session")
    public ResponseEntity<ApiResponse<ChatSessionResponse>> createSession(
            @AuthenticationPrincipal UserJpaEntity user,
            @RequestBody @Valid CreateChatSessionCommand command) {

        log.info("Creating chat session for user: {}", user.getId());
        ChatSessionResponse response = chatSessionUseCase.createSession(user.getId(), command);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Session created"));
    }

    @GetMapping("/sessions")
    @Operation(summary = "Get all chat sessions for current user")
    public ResponseEntity<ApiResponse<List<ChatSessionResponse>>> getUserSessions(
            @AuthenticationPrincipal UserJpaEntity user) {

        List<ChatSessionResponse> sessions = chatSessionUseCase.getUserSessions(user.getId());
        return ResponseEntity.ok(ApiResponse.success(sessions, "Sessions loaded"));
    }

    @GetMapping("/sessions/{sessionId}")
    @Operation(summary = "Get a specific chat session")
    public ResponseEntity<ApiResponse<ChatSessionResponse>> getSession(
            @AuthenticationPrincipal UserJpaEntity user,
            @PathVariable UUID sessionId) {

        ChatSessionResponse session = chatSessionUseCase.getSession(sessionId);
        verifySessionOwner(session, user.getId());
        return ResponseEntity.ok(ApiResponse.success(session, "Session loaded"));
    }

    @PutMapping("/sessions/{sessionId}/archive")
    @Operation(summary = "Archive a chat session")
    public ResponseEntity<ApiResponse<Void>> archiveSession(
            @AuthenticationPrincipal UserJpaEntity user,
            @PathVariable UUID sessionId) {

        ChatSessionResponse session = chatSessionUseCase.getSession(sessionId);
        verifySessionOwner(session, user.getId());
        chatSessionUseCase.archiveSession(sessionId);
        return ResponseEntity.ok(ApiResponse.success(null, "Session archived"));
    }

    @DeleteMapping("/sessions/{sessionId}")
    @Operation(summary = "Delete a chat session")
    public ResponseEntity<ApiResponse<Void>> deleteSession(
            @AuthenticationPrincipal UserJpaEntity user,
            @PathVariable UUID sessionId) {

        ChatSessionResponse session = chatSessionUseCase.getSession(sessionId);
        verifySessionOwner(session, user.getId());
        chatSessionUseCase.deleteSession(sessionId);
        return ResponseEntity.ok(ApiResponse.success(null, "Session deleted"));
    }

    // ============== Chat Endpoints ==============

    @PostMapping("/sessions/{sessionId}/messages")
    @Operation(summary = "Send a message and get AI response")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> sendMessage(
            @AuthenticationPrincipal UserJpaEntity user,
            @PathVariable UUID sessionId,
            @RequestBody @Valid SendChatMessageCommand command) {

        log.info("Sending message to session: {}", sessionId);
        ChatSessionResponse session = chatSessionUseCase.getSession(sessionId);
        verifySessionOwner(session, user.getId());

        // Save user message
        ChatMessageJpaEntity userMsg = ChatMessageJpaEntity.builder()
                .sessionId(sessionId)
                .role(ChatMessageJpaEntity.MessageRole.USER)
                .content(command.content())
                .build();
        chatMessageRepository.save(userMsg);

        // Generate template-based AI response
        String aiResponse = generateResponse(command.content(), session.contextType());

        // Save AI response
        ChatMessageJpaEntity aiMsg = ChatMessageJpaEntity.builder()
                .sessionId(sessionId)
                .role(ChatMessageJpaEntity.MessageRole.ASSISTANT)
                .content(aiResponse)
                .build();
        chatMessageRepository.save(aiMsg);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("sessionId", sessionId);
        response.put("userMessage", Map.of(
                "id", userMsg.getId(), "content", command.content(), "role", "USER", "createdAt", Instant.now()));
        response.put("aiResponse", Map.of(
                "id", aiMsg.getId(), "content", aiResponse, "role", "ASSISTANT", "createdAt", Instant.now()));

        return ResponseEntity.ok(ApiResponse.success(response, "Message sent"));
    }

    @GetMapping("/sessions/{sessionId}/messages")
    @Operation(summary = "Get all messages in a session")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getSessionMessages(
            @AuthenticationPrincipal UserJpaEntity user,
            @PathVariable UUID sessionId) {

        ChatSessionResponse session = chatSessionUseCase.getSession(sessionId);
        verifySessionOwner(session, user.getId());

        List<ChatMessageJpaEntity> messages = chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        List<Map<String, Object>> result = messages.stream().map(m -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", m.getId());
            map.put("role", m.getRole().name());
            map.put("content", m.getContent());
            map.put("createdAt", m.getCreatedAt());
            return map;
        }).toList();

        return ResponseEntity.ok(ApiResponse.success(result, "Messages loaded"));
    }

    @PostMapping("/chat")
    @Operation(summary = "Quick chat without session (stateless)")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> quickChat(
            @AuthenticationPrincipal UserJpaEntity user,
            @RequestBody @Valid SendChatMessageCommand command) {

        log.info("Quick chat from user: {}", user.getId());
        String aiResponse = generateResponse(command.content(), "GENERAL");

        Map<String, Object> response = Map.of(
            "userId", user.getId(),
            "query", command.content(),
            "response", aiResponse
        );

        return ResponseEntity.ok(ApiResponse.success(response, "Chat response"));
    }

    // ============== Context-Aware Chat ==============

    @PostMapping("/courses/{courseId}/ask")
    @Operation(summary = "Ask AI about a specific course")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> askAboutCourse(
            @AuthenticationPrincipal UserJpaEntity user,
            @PathVariable UUID courseId,
            @RequestBody @Valid SendChatMessageCommand command) {

        log.info("Course context question for course: {}", courseId);
        String aiResponse = generateResponse(command.content(), "COURSE");

        Map<String, Object> response = Map.of(
            "courseId", courseId,
            "query", command.content(),
            "response", aiResponse,
            "context", "course"
        );

        return ResponseEntity.ok(ApiResponse.success(response, "Course context response"));
    }

    @PostMapping("/lessons/{lessonId}/explain")
    @Operation(summary = "Get AI explanation for a lesson")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> explainLesson(
            @AuthenticationPrincipal UserJpaEntity user,
            @PathVariable UUID lessonId,
            @Valid @RequestBody(required = false) SendChatMessageCommand command) {

        String query = command != null ? command.content() : "Giải thích bài học này";
        String aiResponse = generateResponse(query, "LESSON");

        Map<String, Object> response = Map.of(
            "lessonId", lessonId,
            "query", query,
            "explanation", aiResponse,
            "context", "lesson"
        );

        return ResponseEntity.ok(ApiResponse.success(response, "Lesson explanation"));
    }

    // ============== Helpers ==============

    private void verifySessionOwner(ChatSessionResponse session, UUID currentUserId) {
        if (session.userId() != null && !session.userId().equals(currentUserId)) {
            throw new AccessDeniedException("You do not have permission to access this session");
        }
    }

    /**
     * Template-based AI response for MVP (no external AI API needed).
     * Returns contextual responses based on user query and context type.
     */
    private String generateResponse(String userQuery, String contextType) {
        String query = userQuery.toLowerCase();

        // Maritime/Navigation context
        if (query.contains("hàng hải") || query.contains("navigation") || query.contains("tàu") || query.contains("ship")) {
            return "Hàng hải là một lĩnh vực quan trọng bao gồm việc điều hướng và vận hành tàu biển. " +
                    "Để nắm vững kiến thức này, bạn cần học về: quy tắc phòng ngừa đâm va trên biển (COLREG), " +
                    "hải đồ và định vị, khí tượng hải dương, và an toàn hàng hải theo STCW 2026. " +
                    "Bạn có muốn tìm hiểu thêm về chủ đề nào cụ thể không?";
        }

        // Safety context
        if (query.contains("an toàn") || query.contains("safety") || query.contains("stcw")) {
            return "An toàn hàng hải là ưu tiên hàng đầu trên mọi tàu biển. Theo Công ước STCW 2026, " +
                    "tất cả thuyền viên phải được đào tạo về: cứu sinh, phòng cháy chữa cháy, " +
                    "sơ cấp cứu, và an ninh hàng hải. Hãy đảm bảo bạn hoàn thành tất cả " +
                    "các khóa huấn luyện bắt buộc để đạt chứng chỉ năng lực.";
        }

        // Quiz/Exam help
        if (query.contains("quiz") || query.contains("bài kiểm tra") || query.contains("thi") || query.contains("exam")) {
            return "Để chuẩn bị tốt cho bài kiểm tra, hãy: " +
                    "1) Xem lại tất cả bài học trong khóa học, " +
                    "2) Làm lại các bài tập thực hành, " +
                    "3) Ghi chú các điểm quan trọng, " +
                    "4) Thử làm bài quiz luyện tập để quen với dạng câu hỏi. " +
                    "Chúc bạn làm bài tốt!";
        }

        // Course-related
        if ("COURSE".equals(contextType)) {
            return "Đây là một khóa học được thiết kế để giúp bạn nắm vững kiến thức chuyên ngành. " +
                    "Hãy hoàn thành từng bài học theo thứ tự và làm bài tập sau mỗi phần. " +
                    "Nếu gặp khó khăn, hãy xem lại video bài giảng hoặc đặt câu hỏi cho giảng viên.";
        }

        // Lesson-related
        if ("LESSON".equals(contextType)) {
            return "Bài học này cung cấp kiến thức nền tảng quan trọng. " +
                    "Hãy đọc kỹ nội dung, xem video minh họa và hoàn thành phần bài tập. " +
                    "Ghi chú lại những điểm chính để ôn tập sau này.";
        }

        // Greeting
        if (query.contains("xin chào") || query.contains("hello") || query.contains("hi")) {
            return "Xin chào! Tôi là trợ lý AI của Hệ thống Đào tạo Hàng hải. " +
                    "Tôi có thể giúp bạn với các câu hỏi về khóa học, bài học, " +
                    "và kiến thức hàng hải. Bạn cần hỗ trợ gì?";
        }

        // Default response
        return "Cảm ơn câu hỏi của bạn. Hệ thống AI đang trong giai đoạn MVP " +
                "và sẽ được nâng cấp để cung cấp câu trả lời chính xác hơn. " +
                "Trong lúc chờ đợi, bạn có thể tham khảo nội dung bài học " +
                "hoặc liên hệ giảng viên để được hỗ trợ chi tiết.";
    }
}

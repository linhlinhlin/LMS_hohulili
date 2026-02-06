package com.example.lms.ai_assistant.infrastructure.web;

import com.example.lms.ai_assistant.application.dto.ChatSessionResponse;
import com.example.lms.ai_assistant.application.dto.CreateChatSessionCommand;
import com.example.lms.ai_assistant.application.dto.SendChatMessageCommand;
import com.example.lms.ai_assistant.application.usecase.ChatSessionUseCaseV3;
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
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST Controller for AI Assistant functionality.
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
    public ResponseEntity<ApiResponse<Map<String, Object>>> sendMessage(
            @PathVariable UUID sessionId,
            @RequestBody @Valid SendChatMessageCommand command) {

        log.info("Sending message to session: {}", sessionId);

        // TODO: Integrate with AI service
        Map<String, Object> response = Map.of(
            "sessionId", sessionId,
            "userMessage", command.content(),
            "aiResponse", "Tính năng AI đang được phát triển. Vui lòng quay lại sau!",
            "status", "pending_integration"
        );

        return ResponseEntity.ok(ApiResponse.success(response, "Message sent"));
    }

    @PostMapping("/chat")
    @Operation(summary = "Quick chat without session (stateless)")
    public ResponseEntity<ApiResponse<Map<String, Object>>> quickChat(
            @AuthenticationPrincipal UserJpaEntity user,
            @RequestBody @Valid SendChatMessageCommand command) {

        log.info("Quick chat from user: {}", user.getId());

        // TODO: Integrate with AI service
        Map<String, Object> response = Map.of(
            "userId", user.getId(),
            "query", command.content(),
            "response", "Tính năng AI đang được phát triển. Hãy quay lại sau!"
        );

        return ResponseEntity.ok(ApiResponse.success(response, "Chat response"));
    }

    // ============== Context-Aware Chat ==============

    @PostMapping("/courses/{courseId}/ask")
    @Operation(summary = "Ask AI about a specific course")
    public ResponseEntity<ApiResponse<Map<String, Object>>> askAboutCourse(
            @PathVariable UUID courseId,
            @RequestBody @Valid SendChatMessageCommand command) {

        log.info("Course context question for course: {}", courseId);

        // TODO: Integrate with AI service with course context
        Map<String, Object> response = Map.of(
            "courseId", courseId,
            "query", command.content(),
            "response", "Tính năng AI theo ngữ cảnh đang được phát triển.",
            "context", "course"
        );

        return ResponseEntity.ok(ApiResponse.success(response, "Course context response"));
    }

    @PostMapping("/lessons/{lessonId}/explain")
    @Operation(summary = "Get AI explanation for a lesson")
    public ResponseEntity<ApiResponse<Map<String, Object>>> explainLesson(
            @PathVariable UUID lessonId,
            @Valid @RequestBody(required = false) SendChatMessageCommand command) {

        String query = command != null ? command.content() : "Giải thích bài học này";

        // TODO: Integrate with AI service with lesson context
        Map<String, Object> response = Map.of(
            "lessonId", lessonId,
            "query", query,
            "explanation", "Tính năng giải thích bài học bằng AI đang được phát triển.",
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
}

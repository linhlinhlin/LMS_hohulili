package com.example.lms.ai_assistant.application.port;

import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Optional;

/**
 * Port interface for AI chat operations.
 *
 * <p>Abstracts the external AI service from the application layer.
 * The controller depends on this port; the concrete adapter
 * ({@code WiiiChatAdapter}) implements it.
 *
 * <p>Follows Hexagonal Architecture: application layer defines
 * the port, infrastructure layer provides the adapter.
 */
public interface AiChatService {

    /**
     * Send a message and get a synchronous AI response.
     *
     * @param userId    LMS user UUID
     * @param email     User email
     * @param fullName  User display name
     * @param role      LMS role (STUDENT, TEACHER, ADMIN, ORG_ADMIN)
     * @param message   User message text
     * @param sessionId Optional session ID for conversation context
     * @param domainId  Optional domain ID (defaults to "maritime")
     * @return AI response text, or empty on failure
     */
    Optional<String> chat(String userId, String email, String fullName,
                          String role, String message,
                          String sessionId, String domainId);

    /**
     * Stream an AI response via Server-Sent Events.
     *
     * @return SseEmitter that forwards AI response events to the client
     */
    SseEmitter streamChat(String userId, String email, String fullName,
                           String role, String message,
                           String sessionId, String domainId);
}

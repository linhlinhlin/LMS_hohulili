package com.example.lms.ai_assistant.domain.model;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

/**
 * ChatMessage Domain Model - Entity within ChatSession Aggregate.
 * 
 * Represents a single message in a chat session.
 */
@Getter
@Builder
public class ChatMessage {

    private UUID id;
    private ChatSessionId sessionId;
    private MessageRole role;
    private String content;
    private Instant createdAt;

    /**
     * Role of the message sender.
     */
    public enum MessageRole {
        USER,
        ASSISTANT,
        SYSTEM
    }

    // ============ Factory Methods ============

    /**
     * Create a user message.
     */
    public static ChatMessage userMessage(ChatSessionId sessionId, String content) {
        validateContent(content);
        return ChatMessage.builder()
            .id(UUID.randomUUID())
            .sessionId(sessionId)
            .role(MessageRole.USER)
            .content(content)
            .createdAt(Instant.now())
            .build();
    }

    /**
     * Create an assistant message.
     */
    public static ChatMessage assistantMessage(ChatSessionId sessionId, String content) {
        return ChatMessage.builder()
            .id(UUID.randomUUID())
            .sessionId(sessionId)
            .role(MessageRole.ASSISTANT)
            .content(content)
            .createdAt(Instant.now())
            .build();
    }

    /**
     * Create a system message.
     */
    public static ChatMessage systemMessage(ChatSessionId sessionId, String content) {
        return ChatMessage.builder()
            .id(UUID.randomUUID())
            .sessionId(sessionId)
            .role(MessageRole.SYSTEM)
            .content(content)
            .createdAt(Instant.now())
            .build();
    }

    /**
     * Reconstitute from persistence.
     */
    public static ChatMessage reconstitute(
            UUID id,
            ChatSessionId sessionId,
            MessageRole role,
            String content,
            Instant createdAt
    ) {
        return ChatMessage.builder()
            .id(id)
            .sessionId(sessionId)
            .role(role)
            .content(content)
            .createdAt(createdAt)
            .build();
    }

    // ============ Query Methods ============

    public boolean isFromUser() {
        return this.role == MessageRole.USER;
    }

    public boolean isFromAssistant() {
        return this.role == MessageRole.ASSISTANT;
    }

    // ============ Validation ============

    private static void validateContent(String content) {
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("Message content cannot be empty");
        }
    }
}

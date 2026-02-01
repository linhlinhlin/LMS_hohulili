package com.example.lms.ai_assistant.application.usecase;

import com.example.lms.ai_assistant.application.dto.ChatSessionResponse;
import com.example.lms.ai_assistant.application.dto.CreateChatSessionCommand;
import com.example.lms.ai_assistant.domain.model.ChatSession;
import com.example.lms.ai_assistant.domain.model.ChatSessionId;
import com.example.lms.ai_assistant.domain.repository.ChatSessionRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Use case for managing chat sessions.
 * 
 * Clean Architecture: Application layer depends on Domain layer only.
 */
@Service
@RequiredArgsConstructor
public class ChatSessionUseCaseV3 {

    private static final Logger log = LoggerFactory.getLogger(ChatSessionUseCaseV3.class);

    private final ChatSessionRepository chatSessionRepository;

    /**
     * Create a new chat session.
     */
    @Transactional
    public ChatSessionResponse createSession(UUID userId, CreateChatSessionCommand command) {
        log.info("Creating new chat session for user: {}", userId);

        // Parse context type from command
        ChatSession.ContextType contextType = ChatSession.ContextType.GENERAL;
        if (command.contextType() != null) {
            try {
                contextType = ChatSession.ContextType.valueOf(command.contextType());
            } catch (Exception ignored) {}
        }

        // Create domain model using factory method
        ChatSession session = ChatSession.create(
            userId,
            command.title(),
            contextType,
            command.contextId()
        );

        ChatSession saved = chatSessionRepository.save(session);
        log.info("Chat session created: {}", saved.getId().value());

        return mapToResponse(saved);
    }

    /**
     * Get all chat sessions for a user.
     */
    @Transactional(readOnly = true)
    public List<ChatSessionResponse> getUserSessions(UUID userId) {
        log.info("Getting chat sessions for user: {}", userId);

        return chatSessionRepository.findByUserId(userId)
            .stream()
            .map(this::mapToResponse)
            .collect(Collectors.toList());
    }

    /**
     * Get a specific chat session.
     */
    @Transactional(readOnly = true)
    public ChatSessionResponse getSession(UUID sessionId) {
        ChatSession session = chatSessionRepository.findById(ChatSessionId.of(sessionId))
            .orElseThrow(() -> new EntityNotFoundException("Chat session", sessionId));

        return mapToResponse(session);
    }

    /**
     * Archive a chat session.
     */
    @Transactional
    public void archiveSession(UUID sessionId) {
        log.info("Archiving chat session: {}", sessionId);

        ChatSession session = chatSessionRepository.findById(ChatSessionId.of(sessionId))
            .orElseThrow(() -> new EntityNotFoundException("Chat session", sessionId));

        session.archive();
        chatSessionRepository.save(session);
    }

    /**
     * Delete a chat session.
     */
    @Transactional
    public void deleteSession(UUID sessionId) {
        log.info("Deleting chat session: {}", sessionId);
        chatSessionRepository.deleteById(ChatSessionId.of(sessionId));
    }

    private ChatSessionResponse mapToResponse(ChatSession session) {
        return new ChatSessionResponse(
            session.getId().value(),
            session.getUserId(),
            session.getTitle(),
            session.getContextType().name(),
            session.getContextId(),
            session.isArchived(),
            session.getCreatedAt(),
            session.getUpdatedAt()
        );
    }
}


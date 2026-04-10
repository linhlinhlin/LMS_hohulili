package com.example.lms.communication.application.usecase;

import com.example.lms.communication.application.service.WebSocketMessageService;
import com.example.lms.communication.domain.model.Conversation;
import com.example.lms.communication.domain.model.Message;
import com.example.lms.communication.domain.repository.ConversationRepository;
import com.example.lms.communication.domain.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Use case for sending a message.
 * V3 - Uses pure domain models only.
 * 
 * Clean Architecture: Application layer depends on Domain layer only.
 */
@Service("sendMessageUseCaseV3")
@RequiredArgsConstructor
@Slf4j
public class SendMessageUseCaseV3 {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final WebSocketMessageService webSocketMessageService;

    public record SendMessageCommand(
        UUID senderId,
        UUID recipientId,
        String content,
        String senderName,
        String senderRole,
        UUID replyToId,
        Map<String, Object> replyToData
    ) {
        public SendMessageCommand(UUID senderId, UUID recipientId, String content) {
            this(senderId, recipientId, content, null, null, null, null);
        }

        public SendMessageCommand(UUID senderId, UUID recipientId, String content,
                                   String senderName, String senderRole) {
            this(senderId, recipientId, content, senderName, senderRole, null, null);
        }
    }

    @Transactional
    public SendMessageResult execute(SendMessageCommand command) {
        log.info("Sending message from {} to {} (V3)", command.senderId(), command.recipientId());

        // 1. Find or create conversation using domain model
        Conversation conversation = conversationRepository
            .findByParticipants(command.senderId(), command.recipientId())
            .orElseGet(() -> {
                Conversation newConv = Conversation.create(
                    command.senderId(),
                    command.recipientId()
                );
                return conversationRepository.save(newConv);
            });

        // 2. Create message using domain model factory
        Message message = Message.create(
            conversation.getId(),
            command.senderId(),
            command.content()
        );

        Message saved = messageRepository.save(message);

        // 3. Update conversation last message
        conversation.updateLastMessage(
            message.getPreview(50),
            Instant.now()
        );
        conversationRepository.save(conversation);

        UUID conversationId = conversation.getId().value();
        UUID messageId = saved.getId().value();

        // 4. Broadcast via WebSocket (non-blocking, with optional replyTo context)
        try {
            webSocketMessageService.broadcastNewMessage(
                    conversationId, messageId, command.senderId(),
                    command.senderName(), command.senderRole(), command.content(),
                    command.replyToId(), command.replyToData());

            // Push updated unread count to the recipient
            long recipientUnread = messageRepository.countTotalUnreadForUser(command.recipientId());
            webSocketMessageService.pushUnreadCount(command.recipientId(), recipientUnread);
        } catch (Exception e) {
            log.warn("WebSocket broadcast failed (message still saved): {}", e.getMessage());
        }

        log.info("Message sent with ID {} (V3)", messageId);
        return new SendMessageResult(messageId, conversationId);
    }

    public record SendMessageResult(UUID messageId, UUID conversationId) {}
}


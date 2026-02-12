package com.example.lms.communication.infrastructure.web;

import com.example.lms.communication.application.usecase.SendMessageUseCaseV3;
import com.example.lms.communication.domain.model.Conversation;
import com.example.lms.communication.domain.model.ConversationId;
import com.example.lms.communication.domain.model.Message;
import com.example.lms.communication.domain.model.MessageId;
import com.example.lms.communication.domain.repository.ConversationRepository;
import com.example.lms.communication.domain.repository.MessageRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

/**
 * V3 Controller for Communication.
 * Uses pure DDD patterns with real database queries.
 */
@Tag(name = "Communication V3", description = "DDD-based messaging endpoints")
@RestController
@RequestMapping("/api/v3/messages")
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class CommunicationControllerV3 {

    private final SendMessageUseCaseV3 sendMessageUseCase;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserJpaRepository userJpaRepository;

    // ============== Conversation Endpoints ==============

    @Operation(summary = "Get all conversations for current user")
    @GetMapping("/conversations")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getConversations(
            @AuthenticationPrincipal UserJpaEntity user,
            @RequestParam(required = false, defaultValue = "false") boolean includeArchived
    ) {
        UUID userId = user.getId();
        List<Conversation> conversations = includeArchived
                ? conversationRepository.findByParticipantId(userId)
                : conversationRepository.findActiveByParticipantId(userId);

        List<Map<String, Object>> result = conversations.stream()
                .map(conv -> mapConversation(conv, userId))
                .toList();

        return ResponseEntity.ok(ApiResponse.success(result, "Conversations loaded"));
    }

    @Operation(summary = "Get conversation between two users")
    @GetMapping("/conversations/between")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getConversationBetween(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @RequestParam UUID userId1,
            @RequestParam UUID userId2
    ) {
        Optional<Conversation> conv = conversationRepository.findByParticipants(userId1, userId2);
        if (conv.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(null, "Không tìm thấy cuộc hội thoại"));
        }
        UUID currentUserId = currentUser.getId();
        return ResponseEntity.ok(ApiResponse.success(
                mapConversation(conv.get(), currentUserId), "Conversation found"));
    }

    @Operation(summary = "Get messages in a conversation")
    @GetMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getMessages(
            @PathVariable UUID conversationId
    ) {
        List<Message> messages = messageRepository.findByConversationId(ConversationId.of(conversationId));
        List<Map<String, Object>> result = messages.stream()
                .map(this::mapMessage)
                .toList();

        return ResponseEntity.ok(ApiResponse.success(result, "Messages loaded"));
    }

    // ============== Message Endpoints ==============

    @Operation(summary = "Send a message to another user")
    @PostMapping("/send")
    public ResponseEntity<ApiResponse<Map<String, Object>>> sendMessage(
            @AuthenticationPrincipal UserJpaEntity user,
            @Valid @RequestBody SendMessageRequest request
    ) {
        UUID senderId = user.getId();

        var command = new SendMessageUseCaseV3.SendMessageCommand(
            senderId,
            request.recipientId(),
            request.content()
        );
        UUID messageId = sendMessageUseCase.execute(command);

        // Get real conversation ID
        Conversation conversation = conversationRepository
                .findByParticipants(senderId, request.recipientId())
                .orElse(null);

        var response = new LinkedHashMap<String, Object>();
        response.put("message", Map.of(
            "id", messageId,
            "content", request.content(),
            "senderId", senderId,
            "createdAt", Instant.now()
        ));
        response.put("conversationId", conversation != null ? conversation.getId().value() : null);

        return ResponseEntity.ok(ApiResponse.success(response, "Gửi tin nhắn thành công"));
    }

    @Operation(summary = "Mark messages as read")
    @PatchMapping("/mark-read")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            @Valid @RequestBody MarkAsReadRequest request
    ) {
        int count = 0;
        for (UUID msgId : request.messageIds()) {
            Optional<Message> msgOpt = messageRepository.findById(MessageId.of(msgId));
            if (msgOpt.isPresent()) {
                Message msg = msgOpt.get();
                msg.markAsRead();
                messageRepository.save(msg);
                count++;
            }
        }
        return ResponseEntity.ok(ApiResponse.success(null, count + " tin nhắn đã được đánh dấu đã đọc"));
    }

    @Operation(summary = "Get unread message count")
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUnreadCount(
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        UUID userId = user.getId();
        List<Conversation> conversations = conversationRepository.findActiveByParticipantId(userId);

        long totalUnread = 0;
        for (Conversation conv : conversations) {
            List<Message> unread = messageRepository.findUnreadByConversationId(conv.getId());
            // Only count messages NOT sent by us
            totalUnread += unread.stream().filter(m -> !m.isFrom(userId)).count();
        }

        Map<String, Object> result = Map.of("unreadCount", totalUnread);
        return ResponseEntity.ok(ApiResponse.success(result, "Unread count loaded"));
    }

    // ============== Helpers ==============

    private Map<String, Object> mapConversation(Conversation conv, UUID currentUserId) {
        UUID otherUserId = conv.getOtherParticipant(currentUserId);
        String otherUserName = userJpaRepository.findById(otherUserId)
                .map(UserJpaEntity::getFullName)
                .orElse("Unknown");

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", conv.getId().value());
        map.put("otherUserId", otherUserId);
        map.put("otherUserName", otherUserName);
        map.put("lastMessagePreview", conv.getLastMessagePreview());
        map.put("lastMessageAt", conv.getLastMessageAt());
        map.put("isArchived", conv.isArchivedFor(currentUserId));
        map.put("createdAt", conv.getCreatedAt());
        return map;
    }

    private Map<String, Object> mapMessage(Message msg) {
        String senderName = userJpaRepository.findById(msg.getSenderId())
                .map(UserJpaEntity::getFullName)
                .orElse("Unknown");

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", msg.getId().value());
        map.put("conversationId", msg.getConversationId().value());
        map.put("senderId", msg.getSenderId());
        map.put("senderName", senderName);
        map.put("content", msg.getContent());
        map.put("isRead", msg.isRead());
        map.put("createdAt", msg.getCreatedAt());
        map.put("readAt", msg.getReadAt());
        return map;
    }

    // ============== Request DTOs ==============

    public record SendMessageRequest(
        @NotNull(message = "Recipient ID is required")
        UUID recipientId,
        @NotBlank(message = "Content is required")
        String content
    ) {}

    public record MarkAsReadRequest(
        @NotEmpty(message = "Message IDs cannot be empty")
        List<UUID> messageIds
    ) {}
}

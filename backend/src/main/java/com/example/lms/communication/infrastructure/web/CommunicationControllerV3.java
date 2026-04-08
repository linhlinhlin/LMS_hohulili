package com.example.lms.communication.infrastructure.web;

import com.example.lms.communication.application.dto.MessageRecipientSearchResponse;
import com.example.lms.communication.application.usecase.ListMessageRecipientsUseCase;
import com.example.lms.communication.application.service.MessageAuthorizationService;
import com.example.lms.communication.application.usecase.SendMessageUseCaseV3;
import com.example.lms.communication.domain.model.Conversation;
import com.example.lms.communication.domain.model.ConversationId;
import com.example.lms.communication.domain.model.Message;
import com.example.lms.communication.domain.model.MessageId;
import com.example.lms.communication.domain.repository.ConversationRepository;
import com.example.lms.communication.domain.repository.MessageRepository;
import com.example.lms.identity.domain.model.Role;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

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
    private final ListMessageRecipientsUseCase listMessageRecipientsUseCase;
    private final MessageAuthorizationService messageAuthorizationService;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserJpaRepository userJpaRepository;
    private final com.example.lms.communication.application.service.WebSocketMessageService webSocketMessageService;
    private final com.example.lms.config.WebSocketEventListener webSocketEventListener;
    private final com.example.lms.communication.infrastructure.persistence.repository.MessageReactionJpaRepository reactionRepository;
    private final com.example.lms.communication.infrastructure.persistence.repository.MessageJpaRepositoryV3 messageJpaRepository;

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

        Set<UUID> participantIds = conversations.stream()
                .flatMap(conversation -> Stream.of(conversation.getParticipant1Id(), conversation.getParticipant2Id()))
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<UUID, UserSummary> userSummaryMap = batchFetchUsers(participantIds);

        List<Map<String, Object>> result = conversations.stream()
                .map(conversation -> mapConversation(conversation, userId, userSummaryMap))
                .toList();

        return ResponseEntity.ok(ApiResponse.success(result, "Danh sách hội thoại"));
    }

    @Operation(summary = "Get conversation between two users")
    @GetMapping("/conversations/between")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getConversationBetween(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @RequestParam UUID userId1,
            @RequestParam UUID userId2
    ) {
        UUID currentUserId = currentUser.getId();
        if (!currentUserId.equals(userId1) && !currentUserId.equals(userId2)) {
            return ResponseEntity.status(403).body(ApiResponse.error("Bạn không phải thành viên của cuộc hội thoại này"));
        }

        Optional<Conversation> conversation = conversationRepository.findByParticipants(userId1, userId2);
        if (conversation.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(null, "Không tìm thấy cuộc hội thoại"));
        }

        Map<UUID, UserSummary> userSummaryMap = batchFetchUsers(Set.of(
                conversation.get().getParticipant1Id(),
                conversation.get().getParticipant2Id()
        ));

        return ResponseEntity.ok(ApiResponse.success(
                mapConversation(conversation.get(), currentUserId, userSummaryMap),
                "Thông tin cuộc hội thoại"
        ));
    }

    @Operation(summary = "Get messages in a conversation")
    @GetMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getMessages(
            @PathVariable UUID conversationId,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        Conversation conversation = conversationRepository.findById(ConversationId.of(conversationId))
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Cuộc hội thoại", conversationId));
        if (!conversation.hasParticipant(user.getId())) {
            throw new org.springframework.security.access.AccessDeniedException("Bạn không phải thành viên của cuộc hội thoại này");
        }

        List<Message> messages = messageRepository.findByConversationId(ConversationId.of(conversationId));
        Set<UUID> senderIds = messages.stream()
                .map(Message::getSenderId)
                .collect(Collectors.toSet());
        Map<UUID, UserSummary> senderSummaryMap = batchFetchUsers(senderIds);

        // Batch fetch reactions for all messages
        List<UUID> msgIds = messages.stream().map(m -> m.getId().value()).toList();
        var allReactions = reactionRepository.findByMessageIdIn(msgIds);
        Map<UUID, List<Map<String, Object>>> reactionsByMsg = allReactions.stream()
                .collect(Collectors.groupingBy(
                        com.example.lms.communication.infrastructure.persistence.entity.MessageReactionJpaEntity::getMessageId,
                        Collectors.mapping(r -> {
                            Map<String, Object> rm = new LinkedHashMap<>();
                            rm.put("userId", r.getUserId());
                            rm.put("emoji", r.getEmoji());
                            return rm;
                        }, Collectors.toList())
                ));

        // Build replyTo lookup (Messenger quote-reply pattern)
        Map<UUID, Message> msgById = messages.stream()
                .collect(Collectors.toMap(m -> m.getId().value(), m -> m, (a, b) -> a));

        List<Map<String, Object>> result = messages.stream()
                .map(message -> {
                    Map<String, Object> mapped = mapMessage(message, senderSummaryMap);
                    mapped.put("reactions", reactionsByMsg.getOrDefault(message.getId().value(), List.of()));

                    // Resolve replyTo (Messenger pattern: quoted message above reply)
                    if (message.getReplyToId() != null) {
                        Message replyTarget = msgById.get(message.getReplyToId());
                        if (replyTarget != null) {
                            UserSummary replySender = senderSummaryMap.getOrDefault(replyTarget.getSenderId(), UserSummary.unknown(replyTarget.getSenderId()));
                            mapped.put("replyTo", Map.of(
                                    "id", replyTarget.getId().value(),
                                    "senderName", replySender.displayName(),
                                    "content", replyTarget.getDisplayContent() != null ? replyTarget.getDisplayContent() : ""
                            ));
                        }
                    }
                    return mapped;
                })
                .toList();

        return ResponseEntity.ok(ApiResponse.success(result, "Danh sách tin nhắn"));
    }

    @Operation(summary = "List recipients the current user is allowed to message")
    @GetMapping("/recipients")
    public ResponseEntity<ApiResponse<MessageRecipientSearchResponse>> listRecipients(
            @AuthenticationPrincipal UserJpaEntity user,
            @RequestParam(required = false) String q,
            @RequestParam(required = false, defaultValue = "auto") String contextType,
            @RequestParam(required = false) UUID contextId,
            @RequestParam(required = false, defaultValue = "20") Integer limit
    ) {
        MessageAuthorizationService.ActorContext actor = actorContext(user);
        var items = listMessageRecipientsUseCase.execute(actor, q, contextType, contextId, limit);
        return ResponseEntity.ok(ApiResponse.success(
                new MessageRecipientSearchResponse(items, null),
                "Danh sách người nhận hợp lệ"
        ));
    }

    @Operation(summary = "Send a message to another user")
    @PostMapping("/send")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> sendMessage(
            @AuthenticationPrincipal UserJpaEntity user,
            @Valid @RequestBody SendMessageRequest request
    ) {
        UUID senderId = user.getId();

        if (senderId.equals(request.recipientId())) {
            return ResponseEntity.badRequest().body(ApiResponse.error("400", "Không thể gửi tin nhắn cho chính mình"));
        }

        MessageAuthorizationService.ActorContext actor = actorContext(user);
        if (!messageAuthorizationService.canSendMessage(actor, request.recipientId())) {
            return ResponseEntity.status(403)
                    .body(ApiResponse.error("RECIPIENT_NOT_ALLOWED", "Bạn không thể nhắn tin cho người này"));
        }

        UserSummary senderSummary = batchFetchUsers(Set.of(senderId)).getOrDefault(senderId, UserSummary.unknown(senderId));

        SendMessageUseCaseV3.SendMessageResult result = sendMessageUseCase.execute(
                new SendMessageUseCaseV3.SendMessageCommand(
                        senderId,
                        request.recipientId(),
                        request.content(),
                        senderSummary.displayName(),
                        senderSummary.role()
                ));

        // Set replyToId on JPA entity (Messenger quote-reply pattern)
        if (request.replyToId() != null) {
            messageJpaRepository.findById(result.messageId()).ifPresent(entity -> {
                entity.setReplyToId(request.replyToId());
                messageJpaRepository.save(entity);
            });
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("message", Map.of(
                "id", result.messageId(),
                "content", request.content(),
                "senderId", senderId,
                "senderName", senderSummary.displayName(),
                "senderRole", senderSummary.role(),
                "createdAt", Instant.now()
        ));
        response.put("conversationId", result.conversationId());

        return ResponseEntity.ok(ApiResponse.success(response, "Gửi tin nhắn thành công"));
    }

    @Operation(summary = "Mark messages as read")
    @PatchMapping("/mark-read")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            @AuthenticationPrincipal UserJpaEntity user,
            @Valid @RequestBody MarkAsReadRequest request
    ) {
        int count = 0;
        UUID lastConversationId = null;
        for (UUID messageId : request.messageIds()) {
            Optional<Message> messageOpt = messageRepository.findById(MessageId.of(messageId));
            if (messageOpt.isPresent()) {
                Message message = messageOpt.get();
                Optional<Conversation> conversationOpt = conversationRepository.findById(message.getConversationId());
                if (conversationOpt.isPresent() && conversationOpt.get().hasParticipant(user.getId())) {
                    message.markAsRead();
                    messageRepository.save(message);
                    lastConversationId = message.getConversationId().value();
                    count++;
                }
            }
        }

        // Broadcast read status via WebSocket
        if (count > 0 && lastConversationId != null) {
            try {
                webSocketMessageService.broadcastMessagesRead(lastConversationId, user.getId(), count);
                long unread = messageRepository.countTotalUnreadForUser(user.getId());
                webSocketMessageService.pushUnreadCount(user.getId(), unread);
            } catch (Exception e) {
                // Non-critical: WebSocket broadcast failure doesn't affect the read operation
            }
        }

        return ResponseEntity.ok(ApiResponse.success(null, count + " tin nhắn đã được đánh dấu đã đọc"));
    }

    @Operation(summary = "Get unread message count")
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUnreadCount(
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        long totalUnread = messageRepository.countTotalUnreadForUser(user.getId());
        return ResponseEntity.ok(ApiResponse.success(Map.of("unreadCount", totalUnread), "Số tin nhắn chưa đọc"));
    }

    @Operation(summary = "Thu hồi tin nhắn (15 phút)")
    @PostMapping("/recall")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> recallMessage(
            @AuthenticationPrincipal UserJpaEntity user,
            @RequestBody Map<String, String> request
    ) {
        UUID messageId = UUID.fromString(request.get("messageId"));
        Message message = messageRepository.findById(MessageId.of(messageId))
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Tin nhắn", messageId));

        if (!message.canRecall(user.getId())) {
            boolean isOwner = message.isFrom(user.getId());
            String reason = !isOwner ? "Bạn chỉ có thể thu hồi tin nhắn của mình"
                    : message.isRecalled() ? "Tin nhắn đã được thu hồi"
                    : "Đã quá 15 phút, không thể thu hồi";
            return ResponseEntity.badRequest().body(ApiResponse.error("RECALL_DENIED", reason));
        }

        message.recall();
        messageRepository.save(message);

        // Broadcast via WebSocket
        UUID conversationId = message.getConversationId().value();
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("type", "MESSAGE_RECALLED");
            payload.put("messageId", messageId);
            payload.put("conversationId", conversationId);
            payload.put("timestamp", java.time.Instant.now());
            webSocketMessageService.broadcastNewMessage(conversationId, messageId,
                    user.getId(), user.getFullName(), user.getRole().name(), null);
        } catch (Exception e) { /* non-critical */ }

        return ResponseEntity.ok(ApiResponse.success(
                Map.of("messageId", messageId, "recalled", true),
                "Đã thu hồi tin nhắn"));
    }

    @Operation(summary = "Thả biểu cảm vào tin nhắn")
    @PostMapping("/reactions")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> addReaction(
            @AuthenticationPrincipal UserJpaEntity user,
            @RequestBody Map<String, String> request
    ) {
        UUID messageId = UUID.fromString(request.get("messageId"));
        String emoji = request.get("emoji");

        // Find conversationId for WebSocket broadcast
        UUID conversationId = messageRepository.findById(com.example.lms.communication.domain.model.MessageId.of(messageId))
                .map(msg -> msg.getConversationId().value())
                .orElse(null);

        var existing = reactionRepository.findByMessageIdAndUserIdAndEmoji(messageId, user.getId(), emoji);
        String action;
        if (existing.isPresent()) {
            reactionRepository.delete(existing.get());
            action = "removed";
        } else {
            reactionRepository.save(new com.example.lms.communication.infrastructure.persistence.entity.MessageReactionJpaEntity(
                    messageId, user.getId(), emoji));
            action = "added";
        }

        // Broadcast via WebSocket so the other user sees the reaction in real-time
        if (conversationId != null) {
            try {
                webSocketMessageService.broadcastReaction(conversationId, messageId, user.getId(), emoji, action);
            } catch (Exception e) {
                // Non-critical
            }
        }

        String message = action.equals("added") ? "Đã thả biểu cảm" : "Đã bỏ biểu cảm";
        return ResponseEntity.ok(ApiResponse.success(Map.of("action", action, "emoji", emoji), message));
    }

    @Operation(summary = "Lấy biểu cảm của tin nhắn")
    @GetMapping("/reactions")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getReactions(
            @RequestParam List<UUID> messageIds
    ) {
        var reactions = reactionRepository.findByMessageIdIn(messageIds);
        List<Map<String, Object>> result = reactions.stream().map(r -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("messageId", r.getMessageId());
            map.put("userId", r.getUserId());
            map.put("emoji", r.getEmoji());
            return map;
        }).toList();
        return ResponseEntity.ok(ApiResponse.success(result, "Danh sách biểu cảm"));
    }

    @Operation(summary = "Check online status of users")
    @GetMapping("/online-status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getOnlineStatus(
            @RequestParam List<UUID> userIds
    ) {
        Map<UUID, Boolean> statuses = userIds.stream()
                .collect(Collectors.toMap(id -> id, webSocketEventListener::isUserOnline));
        return ResponseEntity.ok(ApiResponse.success(Map.of("statuses", statuses), "Trạng thái trực tuyến"));
    }

    private Map<String, Object> mapConversation(
            Conversation conversation,
            UUID currentUserId,
            Map<UUID, UserSummary> userSummaryMap
    ) {
        UUID otherUserId = conversation.getOtherParticipant(currentUserId);
        UserSummary otherUser = userSummaryMap.getOrDefault(otherUserId, UserSummary.unknown(otherUserId));
        UserSummary participant1 = userSummaryMap.getOrDefault(conversation.getParticipant1Id(), UserSummary.unknown(conversation.getParticipant1Id()));
        UserSummary participant2 = userSummaryMap.getOrDefault(conversation.getParticipant2Id(), UserSummary.unknown(conversation.getParticipant2Id()));
        long unreadCount = messageRepository.findUnreadByConversationId(conversation.getId()).stream()
                .filter(message -> !message.isFrom(currentUserId))
                .count();

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", conversation.getId().value());
        map.put("otherUserId", otherUserId);
        map.put("otherUserName", otherUser.displayName());
        map.put("otherUserRole", otherUser.role());
        map.put("lastMessagePreview", conversation.getLastMessagePreview());
        map.put("lastMessageAt", conversation.getLastMessageAt());
        map.put("lastMessage", conversation.getLastMessagePreview() != null && conversation.getLastMessageAt() != null
                ? Map.of(
                        "content", conversation.getLastMessagePreview(),
                        "senderId", otherUserId,
                        "createdAt", conversation.getLastMessageAt()
                )
                : null);
        map.put("participants", List.of(
                participantMap(participant1),
                participantMap(participant2)
        ));
        map.put("unreadCount", unreadCount);
        map.put("isArchived", conversation.isArchivedFor(currentUserId));
        map.put("createdAt", conversation.getCreatedAt());
        map.put("updatedAt", conversation.getUpdatedAt());
        return map;
    }

    private Map<String, Object> mapMessage(Message message, Map<UUID, UserSummary> senderSummaryMap) {
        UserSummary sender = senderSummaryMap.getOrDefault(message.getSenderId(), UserSummary.unknown(message.getSenderId()));

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", message.getId().value());
        map.put("conversationId", message.getConversationId().value());
        map.put("senderId", message.getSenderId());
        map.put("senderName", sender.displayName());
        map.put("senderRole", sender.role());
        map.put("content", message.getDisplayContent());
        map.put("isRead", message.isRead());
        map.put("recalled", message.isRecalled());
        map.put("replyToId", message.getReplyToId());
        map.put("createdAt", message.getCreatedAt());
        map.put("readAt", message.getReadAt());
        return map;
    }

    private Map<String, Object> participantMap(UserSummary userSummary) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", userSummary.userId());
        map.put("name", userSummary.displayName());
        map.put("role", userSummary.role());
        map.put("avatar", userSummary.avatarUrl());
        return map;
    }

    private Map<UUID, UserSummary> batchFetchUsers(Set<UUID> userIds) {
        if (userIds.isEmpty()) {
            return Map.of();
        }
        return userJpaRepository.findByIdIn(userIds).stream()
                .collect(Collectors.toMap(
                        UserJpaEntity::getId,
                        user -> new UserSummary(user.getId(), user.getFullName(), user.getRole().name(), user.getAvatarUrl())
                ));
    }

    private MessageAuthorizationService.ActorContext actorContext(UserJpaEntity user) {
        return new MessageAuthorizationService.ActorContext(
                user.getId(),
                Role.valueOf(user.getRole().name()),
                user.getOrganizationId()
        );
    }

    public record SendMessageRequest(
            @NotNull(message = "Mã người nhận không được để trống")
            UUID recipientId,
            @NotBlank(message = "Nội dung không được để trống")
            String content,
            UUID replyToId
    ) {}

    public record MarkAsReadRequest(
            @NotEmpty(message = "Danh sách tin nhắn khong duoc de trong")
            List<UUID> messageIds
    ) {}

    private record UserSummary(
            UUID userId,
            String displayName,
            String role,
            String avatarUrl
    ) {
        private static UserSummary unknown(UUID userId) {
            return new UserSummary(userId, "Unknown", "STUDENT", null);
        }
    }
}

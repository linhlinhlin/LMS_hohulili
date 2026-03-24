package com.example.lms.communication.infrastructure.web;

import com.example.lms.communication.application.dto.MessageRecipientSearchResponse;
import com.example.lms.communication.application.usecase.ListMessageRecipientsUseCase;
import com.example.lms.communication.application.usecase.MessageAuthorizationService;
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

        return ResponseEntity.ok(ApiResponse.success(result, "Danh sach hoi thoai"));
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
            return ResponseEntity.status(403).body(ApiResponse.error("Ban khong phai thanh vien cua cuoc hoi thoai nay"));
        }

        Optional<Conversation> conversation = conversationRepository.findByParticipants(userId1, userId2);
        if (conversation.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(null, "Khong tim thay cuoc hoi thoai"));
        }

        Map<UUID, UserSummary> userSummaryMap = batchFetchUsers(Set.of(
                conversation.get().getParticipant1Id(),
                conversation.get().getParticipant2Id()
        ));

        return ResponseEntity.ok(ApiResponse.success(
                mapConversation(conversation.get(), currentUserId, userSummaryMap),
                "Thong tin cuoc hoi thoai"
        ));
    }

    @Operation(summary = "Get messages in a conversation")
    @GetMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getMessages(
            @PathVariable UUID conversationId,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        Conversation conversation = conversationRepository.findById(ConversationId.of(conversationId))
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Cuoc hoi thoai", conversationId));
        if (!conversation.hasParticipant(user.getId())) {
            throw new org.springframework.security.access.AccessDeniedException("Ban khong phai thanh vien cua cuoc hoi thoai nay");
        }

        List<Message> messages = messageRepository.findByConversationId(ConversationId.of(conversationId));
        Set<UUID> senderIds = messages.stream()
                .map(Message::getSenderId)
                .collect(Collectors.toSet());
        Map<UUID, UserSummary> senderSummaryMap = batchFetchUsers(senderIds);

        List<Map<String, Object>> result = messages.stream()
                .map(message -> mapMessage(message, senderSummaryMap))
                .toList();

        return ResponseEntity.ok(ApiResponse.success(result, "Danh sach tin nhan"));
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
                "Danh sach nguoi nhan hop le"
        ));
    }

    @Operation(summary = "Send a message to another user")
    @PostMapping("/send")
    public ResponseEntity<ApiResponse<Map<String, Object>>> sendMessage(
            @AuthenticationPrincipal UserJpaEntity user,
            @Valid @RequestBody SendMessageRequest request
    ) {
        UUID senderId = user.getId();

        if (senderId.equals(request.recipientId())) {
            return ResponseEntity.badRequest().body(ApiResponse.error("400", "Khong the gui tin nhan cho chinh minh"));
        }

        MessageAuthorizationService.ActorContext actor = actorContext(user);
        if (!messageAuthorizationService.canSendMessage(actor, request.recipientId())) {
            return ResponseEntity.status(403)
                    .body(ApiResponse.error("RECIPIENT_NOT_ALLOWED", "Ban khong the nhan tin cho nguoi nay"));
        }

        UUID messageId = sendMessageUseCase.execute(new SendMessageUseCaseV3.SendMessageCommand(
                senderId,
                request.recipientId(),
                request.content()
        ));

        UUID conversationId = conversationRepository.findByParticipants(senderId, request.recipientId())
                .map(conversation -> conversation.getId().value())
                .orElse(null);

        UserSummary senderSummary = batchFetchUsers(Set.of(senderId)).getOrDefault(senderId, UserSummary.unknown(senderId));

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("message", Map.of(
                "id", messageId,
                "content", request.content(),
                "senderId", senderId,
                "senderName", senderSummary.displayName(),
                "senderRole", senderSummary.role(),
                "createdAt", Instant.now()
        ));
        response.put("conversationId", conversationId);

        return ResponseEntity.ok(ApiResponse.success(response, "Gui tin nhan thanh cong"));
    }

    @Operation(summary = "Mark messages as read")
    @PatchMapping("/mark-read")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            @AuthenticationPrincipal UserJpaEntity user,
            @Valid @RequestBody MarkAsReadRequest request
    ) {
        int count = 0;
        for (UUID messageId : request.messageIds()) {
            Optional<Message> messageOpt = messageRepository.findById(MessageId.of(messageId));
            if (messageOpt.isPresent()) {
                Message message = messageOpt.get();
                Optional<Conversation> conversationOpt = conversationRepository.findById(message.getConversationId());
                if (conversationOpt.isPresent() && conversationOpt.get().hasParticipant(user.getId())) {
                    message.markAsRead();
                    messageRepository.save(message);
                    count++;
                }
            }
        }

        return ResponseEntity.ok(ApiResponse.success(null, count + " tin nhan da duoc danh dau da doc"));
    }

    @Operation(summary = "Get unread message count")
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUnreadCount(
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        long totalUnread = messageRepository.countTotalUnreadForUser(user.getId());
        return ResponseEntity.ok(ApiResponse.success(Map.of("unreadCount", totalUnread), "So tin nhan chua doc"));
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
        map.put("content", message.getContent());
        map.put("isRead", message.isRead());
        map.put("createdAt", message.getCreatedAt());
        map.put("readAt", message.getReadAt());
        return map;
    }

    private Map<String, Object> participantMap(UserSummary userSummary) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", userSummary.userId());
        map.put("name", userSummary.displayName());
        map.put("role", userSummary.role());
        map.put("avatar", null);
        return map;
    }

    private Map<UUID, UserSummary> batchFetchUsers(Set<UUID> userIds) {
        if (userIds.isEmpty()) {
            return Map.of();
        }
        return userJpaRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(
                        UserJpaEntity::getId,
                        user -> new UserSummary(user.getId(), user.getFullName(), user.getRole().name())
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
            @NotNull(message = "Ma nguoi nhan khong duoc de trong")
            UUID recipientId,
            @NotBlank(message = "Noi dung khong duoc de trong")
            String content
    ) {}

    public record MarkAsReadRequest(
            @NotEmpty(message = "Danh sach tin nhan khong duoc de trong")
            List<UUID> messageIds
    ) {}

    private record UserSummary(
            UUID userId,
            String displayName,
            String role
    ) {
        private static UserSummary unknown(UUID userId) {
            return new UserSummary(userId, "Unknown", "STUDENT");
        }
    }
}

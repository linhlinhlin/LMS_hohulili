package com.example.lms.communication.infrastructure.web;

import com.example.lms.communication.application.usecase.SendMessageUseCaseV3;
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
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

/**
 * V3 Controller for Communication.
 * Uses pure DDD patterns.
 */
@Tag(name = "Communication V3", description = "DDD-based messaging endpoints")
@RestController
@RequestMapping("/api/v3/messages")
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class CommunicationControllerV3 {

    private final SendMessageUseCaseV3 sendMessageUseCase;

    // ============== Conversation Endpoints ==============
    
    @Operation(summary = "Get all conversations for current user")
    @GetMapping("/conversations")
    public ResponseEntity<ApiResponse<List<Object>>> getConversations(
            @AuthenticationPrincipal Object principal,
            @RequestParam(required = false, defaultValue = "false") boolean includeArchived
    ) {
        // TODO: Implement conversation retrieval from database
        // For now, return empty list to prevent 403
        return ResponseEntity.ok(ApiResponse.success(Collections.emptyList(), "Chưa có cuộc hội thoại nào"));
    }

    @Operation(summary = "Get conversation between two users")
    @GetMapping("/conversations/between")
    public ResponseEntity<ApiResponse<Object>> getConversationBetween(
            @RequestParam UUID userId1,
            @RequestParam UUID userId2
    ) {
        // TODO: Implement conversation lookup
        return ResponseEntity.ok(ApiResponse.success(null, "Không tìm thấy cuộc hội thoại"));
    }

    @Operation(summary = "Get messages in a conversation")
    @GetMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<ApiResponse<List<Object>>> getMessages(
            @PathVariable UUID conversationId
    ) {
        // TODO: Implement message retrieval
        return ResponseEntity.ok(ApiResponse.success(Collections.emptyList(), "Chưa có tin nhắn"));
    }

    // ============== Message Endpoints ==============

    @Operation(summary = "Send a message to another user")
    @PostMapping("/send")
    public ResponseEntity<ApiResponse<Object>> sendMessage(
            @AuthenticationPrincipal Object principal,
            @Valid @RequestBody SendMessageRequest request
    ) {
        UUID senderId = request.senderId();

        var command = new SendMessageUseCaseV3.SendMessageCommand(
            senderId,
            request.recipientId(),
            request.content()
        );
        UUID messageId = sendMessageUseCase.execute(command);

        var response = new java.util.HashMap<String, Object>();
        response.put("message", java.util.Map.of(
            "id", messageId,
            "content", request.content(),
            "senderId", senderId,
            "createdAt", java.time.Instant.now()
        ));
        response.put("conversationId", UUID.randomUUID()); // TODO: Get real conversation ID

        return ResponseEntity.ok(ApiResponse.success(response, "Gửi tin nhắn thành công"));
    }

    @Operation(summary = "Mark messages as read")
    @PatchMapping("/mark-read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            @Valid @RequestBody MarkAsReadRequest request
    ) {
        // TODO: Implement mark as read
        return ResponseEntity.ok(ApiResponse.success(null, "Messages marked as read"));
    }

    @Operation(summary = "Get unread message count")
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Integer>> getUnreadCount(
            @AuthenticationPrincipal Object principal
    ) {
        // TODO: Implement unread count
        return ResponseEntity.ok(ApiResponse.success(0, "Không có tin nhắn chưa đọc"));
    }

    // ============== Request DTOs ==============

    public record SendMessageRequest(
        @NotNull(message = "Sender ID is required")
        UUID senderId,
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

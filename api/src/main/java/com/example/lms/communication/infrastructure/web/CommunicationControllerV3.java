package com.example.lms.communication.infrastructure.web;

import com.example.lms.communication.application.usecase.SendMessageUseCaseV3;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * V3 Controller for Communication.
 * Uses pure DDD patterns.
 */
@Tag(name = "Communication V3", description = "DDD-based messaging endpoints")
@RestController
@RequestMapping("/api/v3/messages")
@RequiredArgsConstructor
public class CommunicationControllerV3 {

    private final SendMessageUseCaseV3 sendMessageUseCase;

    @Operation(summary = "Send a message to another user")
    @PostMapping
    public ResponseEntity<UUID> sendMessage(
            @AuthenticationPrincipal Object principal,
            @RequestBody SendMessageRequest request
    ) {
        // Extract sender ID from principal (simplified for now)
        UUID senderId = request.senderId(); // In real implementation, get from principal
        
        var command = new SendMessageUseCaseV3.SendMessageCommand(
            senderId,
            request.recipientId(),
            request.content()
        );
        UUID messageId = sendMessageUseCase.execute(command);
        return ResponseEntity.ok(messageId);
    }

    // Request DTO
    public record SendMessageRequest(
        UUID senderId,
        UUID recipientId,
        String content
    ) {}
}

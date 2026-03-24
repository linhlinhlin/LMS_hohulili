package com.example.lms.communication.application.dto;

import java.util.UUID;

public record MessageRecipientCandidateResponse(
        UUID userId,
        String displayName,
        String email,
        String role,
        String avatarUrl,
        UUID conversationId,
        String relationshipType,
        String contextType,
        UUID contextId,
        String contextLabel,
        boolean canMessage
) {}


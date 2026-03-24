package com.example.lms.communication.application.dto;

import java.util.List;

public record MessageRecipientSearchResponse(
        List<MessageRecipientCandidateResponse> items,
        String nextCursor
) {}


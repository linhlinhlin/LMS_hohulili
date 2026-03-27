package com.example.lms.communication.application.usecase;

import com.example.lms.communication.application.dto.MessageRecipientCandidateResponse;
import com.example.lms.communication.application.service.MessageAuthorizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ListMessageRecipientsUseCase {

    private final MessageAuthorizationService authorizationService;

    public List<MessageRecipientCandidateResponse> execute(
            MessageAuthorizationService.ActorContext actor,
            String query,
            String contextType,
            UUID contextId,
            Integer limit
    ) {
        return authorizationService.listRecipients(actor, query, contextType, contextId, limit);
    }
}


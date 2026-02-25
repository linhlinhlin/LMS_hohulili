package com.example.lms.communication.infrastructure.web;

import com.example.lms.communication.application.usecase.SendMessageUseCaseV3;
import com.example.lms.communication.domain.model.*;
import com.example.lms.communication.domain.repository.ConversationRepository;
import com.example.lms.communication.domain.repository.MessageRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Security tests for CommunicationControllerV3 IDOR fixes (P0-3, P0-4, P0-5).
 */
@ExtendWith(MockitoExtension.class)
class CommunicationSecurityTest {

    @Mock private SendMessageUseCaseV3 sendMessageUseCase;
    @Mock private ConversationRepository conversationRepository;
    @Mock private MessageRepository messageRepository;
    @Mock private UserJpaRepository userJpaRepository;

    @InjectMocks
    private CommunicationControllerV3 controller;

    private UserJpaEntity userA;
    private UserJpaEntity userB;
    private UserJpaEntity userC;
    private UUID userAId;
    private UUID userBId;
    private UUID userCId;

    @BeforeEach
    void setUp() {
        userAId = UUID.randomUUID();
        userBId = UUID.randomUUID();
        userCId = UUID.randomUUID();
        userA = mock(UserJpaEntity.class);
        userB = mock(UserJpaEntity.class);
        userC = mock(UserJpaEntity.class);
        lenient().when(userA.getId()).thenReturn(userAId);
        lenient().when(userB.getId()).thenReturn(userBId);
        lenient().when(userC.getId()).thenReturn(userCId);
    }

    @Nested
    @DisplayName("P0-3: getMessages IDOR")
    class GetMessages {

        @Test
        @DisplayName("Từ chối khi không phải thành viên hội thoại")
        void rejectsNonParticipant() {
            UUID convId = UUID.randomUUID();
            Conversation conv = Conversation.reconstitute(
                    ConversationId.of(convId), userAId, userBId,
                    null, null, false, false, Instant.now(), Instant.now());

            when(conversationRepository.findById(ConversationId.of(convId))).thenReturn(Optional.of(conv));

            var response = controller.getMessages(convId, userC);
            assertThat(response.getStatusCode().value()).isEqualTo(403);
        }

        @Test
        @DisplayName("Cho phép thành viên xem tin nhắn")
        void allowsParticipant() {
            UUID convId = UUID.randomUUID();
            Conversation conv = Conversation.reconstitute(
                    ConversationId.of(convId), userAId, userBId,
                    null, null, false, false, Instant.now(), Instant.now());

            when(conversationRepository.findById(ConversationId.of(convId))).thenReturn(Optional.of(conv));
            when(messageRepository.findByConversationId(ConversationId.of(convId))).thenReturn(List.of());

            var response = controller.getMessages(convId, userA);
            assertThat(response.getStatusCode().value()).isEqualTo(200);
        }
    }

    @Nested
    @DisplayName("P0-5: getConversationBetween IDOR")
    class GetConversationBetween {

        @Test
        @DisplayName("Từ chối khi không phải thành viên")
        void requiresParticipant() {
            var response = controller.getConversationBetween(userC, userAId, userBId);
            assertThat(response.getStatusCode().value()).isEqualTo(403);
        }
    }
}

package com.example.lms.communication.infrastructure.web;

import com.example.lms.communication.application.dto.MessageRecipientCandidateResponse;
import com.example.lms.communication.application.usecase.ListMessageRecipientsUseCase;
import com.example.lms.communication.application.service.MessageAuthorizationService;
import com.example.lms.communication.application.usecase.SendMessageUseCaseV3;
import com.example.lms.communication.domain.model.Conversation;
import com.example.lms.communication.domain.model.ConversationId;
import com.example.lms.communication.domain.model.Message;
import com.example.lms.communication.domain.model.MessageId;
import com.example.lms.communication.domain.repository.ConversationRepository;
import com.example.lms.communication.domain.repository.MessageRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommunicationControllerV3Test {

    @Mock private SendMessageUseCaseV3 sendMessageUseCase;
    @Mock private ListMessageRecipientsUseCase listMessageRecipientsUseCase;
    @Mock private MessageAuthorizationService messageAuthorizationService;
    @Mock private ConversationRepository conversationRepository;
    @Mock private MessageRepository messageRepository;
    @Mock private UserJpaRepository userJpaRepository;
    @Mock private com.example.lms.communication.application.service.WebSocketMessageService webSocketMessageService;
    @Mock private com.example.lms.config.WebSocketEventListener webSocketEventListener;

    @InjectMocks
    private CommunicationControllerV3 controller;

    private UserJpaEntity userA;
    private UUID userAId;
    private UUID userBId;
    private UUID unrelatedUserId;

    @BeforeEach
    void setUp() {
        userAId = UUID.randomUUID();
        userBId = UUID.randomUUID();
        unrelatedUserId = UUID.randomUUID();

        userA = mock(UserJpaEntity.class);
        when(userA.getId()).thenReturn(userAId);
    }

    private Conversation createConversation(UUID participant1, UUID participant2) {
        return Conversation.reconstitute(
                ConversationId.of(UUID.randomUUID()),
                participant1,
                participant2,
                "Hello",
                Instant.now(),
                false,
                false,
                Instant.now(),
                Instant.now()
        );
    }

    private Message createMessage(ConversationId conversationId, UUID senderId, boolean isRead) {
        return Message.reconstitute(
                MessageId.of(UUID.randomUUID()),
                conversationId,
                senderId,
                "Test message",
                isRead,
                Instant.now(),
                isRead ? Instant.now() : null
        );
    }

    @Nested
    @DisplayName("getConversations")
    class GetConversations {

        @Test
        @DisplayName("returns conversations for current user")
        void returnsConversationsForUser() {
            Conversation conversation = createConversation(userAId, userBId);
            when(userA.getRole()).thenReturn(UserJpaEntity.UserRole.STUDENT);
            when(conversationRepository.findActiveByParticipantId(userAId)).thenReturn(List.of(conversation));
            when(messageRepository.findUnreadByConversationId(conversation.getId())).thenReturn(List.of());

            UserJpaEntity userB = mock(UserJpaEntity.class);
            when(userB.getId()).thenReturn(userBId);
            when(userB.getFullName()).thenReturn("User B");
            when(userB.getRole()).thenReturn(UserJpaEntity.UserRole.TEACHER);
            when(userJpaRepository.findByIdIn(any())).thenReturn(List.of(userB, userA));

            var response = controller.getConversations(userA, false);

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().getData()).hasSize(1);
            assertThat(response.getBody().getData().get(0).get("otherUserName")).isEqualTo("User B");
            assertThat(response.getBody().getData().get(0)).containsKeys("participants", "unreadCount", "updatedAt");
        }
    }

    @Nested
    @DisplayName("getUnreadCount")
    class GetUnreadCount {

        @Test
        @DisplayName("counts unread messages with single query")
        void countsCorrectly() {
            when(messageRepository.countTotalUnreadForUser(userAId)).thenReturn(2L);

            var response = controller.getUnreadCount(userA);

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().getData().get("unreadCount")).isEqualTo(2L);
        }
    }

    @Nested
    @DisplayName("markAsRead")
    class MarkAsRead {

        @Test
        @DisplayName("marks messages as read for conversation participants")
        void marksOwnConversationMessages() {
            Conversation conversation = createConversation(userAId, userBId);
            Message message = createMessage(conversation.getId(), userBId, false);

            when(messageRepository.findById(message.getId())).thenReturn(Optional.of(message));
            when(conversationRepository.findById(message.getConversationId())).thenReturn(Optional.of(conversation));

            var response = controller.markAsRead(userA, new CommunicationControllerV3.MarkAsReadRequest(List.of(message.getId().value())));

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            verify(messageRepository).save(message);
        }
    }

    @Nested
    @DisplayName("listRecipients")
    class ListRecipients {

        @Test
        @DisplayName("returns eligible recipients for picker")
        void returnsEligibleRecipients() {
            when(userA.getRole()).thenReturn(UserJpaEntity.UserRole.STUDENT);
            when(userA.getOrganizationId()).thenReturn(UUID.randomUUID());
            when(listMessageRecipientsUseCase.execute(any(), any(), any(), any(), any()))
                    .thenReturn(List.of(
                            new MessageRecipientCandidateResponse(
                                    userBId,
                                    "Teacher B",
                                    "teacher@maritime.edu",
                                    "TEACHER",
                                    null,
                                    null,
                                    "CLASS_TEACHER",
                                    "class",
                                    UUID.randomUUID(),
                                    "ECDIS-2026B",
                                    true
                            )
                    ));

            var response = controller.listRecipients(userA, "teach", "auto", null, 20);

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().getData().items()).hasSize(1);
            assertThat(response.getBody().getData().items().get(0).displayName()).isEqualTo("Teacher B");
        }
    }

    @Nested
    @DisplayName("sendMessage")
    class SendMessage {

        @Test
        @DisplayName("sends message and returns created payload")
        void createsAndReturns() {
            UUID messageId = UUID.randomUUID();
            UUID conversationId = UUID.randomUUID();
            when(userA.getRole()).thenReturn(UserJpaEntity.UserRole.STUDENT);
            when(userA.getOrganizationId()).thenReturn(UUID.randomUUID());
            when(messageAuthorizationService.canSendMessage(any(), eq(userBId))).thenReturn(true);

            UserJpaEntity sender = mock(UserJpaEntity.class);
            when(sender.getId()).thenReturn(userAId);
            when(sender.getFullName()).thenReturn("User A");
            when(sender.getRole()).thenReturn(UserJpaEntity.UserRole.STUDENT);
            when(userJpaRepository.findByIdIn(any())).thenReturn(List.of(sender));

            when(sendMessageUseCase.execute(any())).thenReturn(
                    new SendMessageUseCaseV3.SendMessageResult(messageId, conversationId));

            var response = controller.sendMessage(userA, new CommunicationControllerV3.SendMessageRequest(userBId, "Xin chao"));

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            assertThat(response.getBody()).isNotNull();
            @SuppressWarnings("unchecked")
            var messageData = (java.util.Map<String, Object>) response.getBody().getData().get("message");
            assertThat(messageData.get("id")).isEqualTo(messageId);
            assertThat(messageData.get("senderRole")).isEqualTo("STUDENT");
        }

        @Test
        @DisplayName("rejects self messaging")
        void rejectsSelfMessaging() {
            var response = controller.sendMessage(userA, new CommunicationControllerV3.SendMessageRequest(userAId, "Hello me"));

            assertThat(response.getStatusCode().value()).isEqualTo(400);
            verify(sendMessageUseCase, never()).execute(any());
        }

        @Test
        @DisplayName("rejects recipients outside allowed scope")
        void rejectsRecipientOutsideScope() {
            when(userA.getRole()).thenReturn(UserJpaEntity.UserRole.STUDENT);
            when(userA.getOrganizationId()).thenReturn(UUID.randomUUID());
            when(messageAuthorizationService.canSendMessage(any(), eq(unrelatedUserId))).thenReturn(false);

            var response = controller.sendMessage(userA, new CommunicationControllerV3.SendMessageRequest(unrelatedUserId, "Hello stranger"));

            assertThat(response.getStatusCode().value()).isEqualTo(403);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().getError().getCode()).isEqualTo("RECIPIENT_NOT_ALLOWED");
            verify(sendMessageUseCase, never()).execute(any());
        }
    }
}

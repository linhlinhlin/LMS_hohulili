package com.example.lms.communication.infrastructure.web;

import com.example.lms.communication.application.usecase.SendMessageUseCaseV3;
import com.example.lms.communication.domain.model.*;
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
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Functional tests for CommunicationControllerV3 endpoints.
 * Covers: getConversations, getUnreadCount, markAsRead, sendMessage.
 */
@ExtendWith(MockitoExtension.class)
class CommunicationControllerV3Test {

    @Mock private SendMessageUseCaseV3 sendMessageUseCase;
    @Mock private ConversationRepository conversationRepository;
    @Mock private MessageRepository messageRepository;
    @Mock private UserJpaRepository userJpaRepository;

    @InjectMocks
    private CommunicationControllerV3 controller;

    private UserJpaEntity userA;
    private UUID userAId;
    private UUID userBId;

    @BeforeEach
    void setUp() {
        userAId = UUID.randomUUID();
        userBId = UUID.randomUUID();
        userA = mock(UserJpaEntity.class);
        when(userA.getId()).thenReturn(userAId);
    }

    private Conversation createConversation(UUID participant1, UUID participant2) {
        return Conversation.reconstitute(
                ConversationId.of(UUID.randomUUID()), participant1, participant2,
                "Hello", Instant.now(), false, false, Instant.now(), Instant.now());
    }

    private Message createMessage(ConversationId convId, UUID senderId, boolean isRead) {
        return Message.reconstitute(
                MessageId.of(UUID.randomUUID()), convId, senderId,
                "Test message", isRead, Instant.now(), isRead ? Instant.now() : null);
    }

    // ── getConversations ────────────────────────────────────────────

    @Nested
    @DisplayName("getConversations")
    class GetConversations {

        @Test
        @DisplayName("Trả về danh sách hội thoại của người dùng")
        void returnsConversationsForUser() {
            var conv = createConversation(userAId, userBId);
            when(conversationRepository.findActiveByParticipantId(userAId))
                    .thenReturn(List.of(conv));
            var userB = mock(UserJpaEntity.class);
            when(userB.getId()).thenReturn(userBId);
            when(userB.getFullName()).thenReturn("User B");
            when(userJpaRepository.findAllById(any()))
                    .thenReturn(List.of(userB));

            var response = controller.getConversations(userA, false);
            assertThat(response.getStatusCode().value()).isEqualTo(200);

            var body = response.getBody();
            assertThat(body).isNotNull();
            assertThat(body.getData()).hasSize(1);
            assertThat(body.getData().get(0).get("otherUserName")).isEqualTo("User B");
        }

        @Test
        @DisplayName("Trả về danh sách rỗng khi không có hội thoại")
        void returnsEmptyList() {
            when(conversationRepository.findActiveByParticipantId(userAId))
                    .thenReturn(List.of());

            var response = controller.getConversations(userA, false);
            assertThat(response.getStatusCode().value()).isEqualTo(200);
            assertThat(response.getBody().getData()).isEmpty();
        }
    }

    // ── getUnreadCount ──────────────────────────────────────────────

    @Nested
    @DisplayName("getUnreadCount")
    class GetUnreadCount {

        @Test
        @DisplayName("Đếm đúng số tin nhắn chưa đọc (single query)")
        void countsCorrectly() {
            // Single query returns total unread count directly
            when(messageRepository.countTotalUnreadForUser(userAId)).thenReturn(2L);

            var response = controller.getUnreadCount(userA);
            assertThat(response.getStatusCode().value()).isEqualTo(200);
            assertThat(response.getBody().getData().get("unreadCount")).isEqualTo(2L);
        }

        @Test
        @DisplayName("Trả về 0 khi tất cả đã đọc")
        void zeroWhenAllRead() {
            when(messageRepository.countTotalUnreadForUser(userAId)).thenReturn(0L);

            var response = controller.getUnreadCount(userA);
            assertThat(response.getStatusCode().value()).isEqualTo(200);
            assertThat(response.getBody().getData().get("unreadCount")).isEqualTo(0L);
        }
    }

    // ── markAsRead ──────────────────────────────────────────────────

    @Nested
    @DisplayName("markAsRead")
    class MarkAsRead {

        @Test
        @DisplayName("Đánh dấu tin nhắn đã đọc cho thành viên")
        void marksOwnConversationMessages() {
            var conv = createConversation(userAId, userBId);
            var msg = createMessage(conv.getId(), userBId, false);
            var msgId = msg.getId().value();

            when(messageRepository.findById(msg.getId())).thenReturn(Optional.of(msg));
            when(conversationRepository.findById(msg.getConversationId())).thenReturn(Optional.of(conv));

            var request = new CommunicationControllerV3.MarkAsReadRequest(List.of(msgId));
            var response = controller.markAsRead(userA, request);
            assertThat(response.getStatusCode().value()).isEqualTo(200);
            verify(messageRepository).save(msg);
        }

        @Test
        @DisplayName("Bỏ qua tin nhắn thuộc hội thoại khác")
        void skipsOtherConversationMessages() {
            UUID otherUserId = UUID.randomUUID();
            var otherConv = createConversation(otherUserId, userBId);
            var msg = createMessage(otherConv.getId(), userBId, false);

            when(messageRepository.findById(msg.getId())).thenReturn(Optional.of(msg));
            when(conversationRepository.findById(msg.getConversationId())).thenReturn(Optional.of(otherConv));

            var request = new CommunicationControllerV3.MarkAsReadRequest(List.of(msg.getId().value()));
            controller.markAsRead(userA, request);
            // Message should NOT be saved since userA is not a participant
            verify(messageRepository, never()).save(any());
        }
    }

    // ── sendMessage ─────────────────────────────────────────────────

    @Nested
    @DisplayName("sendMessage")
    class SendMessage {

        @Test
        @DisplayName("Gửi tin nhắn và trả về kết quả")
        void createsAndReturns() {
            UUID messageId = UUID.randomUUID();
            when(sendMessageUseCase.execute(any())).thenReturn(messageId);

            var conv = createConversation(userAId, userBId);
            when(conversationRepository.findByParticipants(userAId, userBId))
                    .thenReturn(Optional.of(conv));

            var request = new CommunicationControllerV3.SendMessageRequest(userBId, "Xin chào!");
            var response = controller.sendMessage(userA, request);

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            @SuppressWarnings("unchecked")
            var messageData = (Map<String, Object>) response.getBody().getData().get("message");
            assertThat(messageData.get("id")).isEqualTo(messageId);
            assertThat(messageData.get("content")).isEqualTo("Xin chào!");
        }

        @Test
        @DisplayName("Gửi tin nhắn tạo hội thoại mới")
        void newConversation() {
            UUID messageId = UUID.randomUUID();
            when(sendMessageUseCase.execute(any())).thenReturn(messageId);
            when(conversationRepository.findByParticipants(userAId, userBId))
                    .thenReturn(Optional.empty());

            var request = new CommunicationControllerV3.SendMessageRequest(userBId, "Hello!");
            var response = controller.sendMessage(userA, request);

            assertThat(response.getStatusCode().value()).isEqualTo(200);
            assertThat(response.getBody().getData().get("conversationId")).isNull();
        }

        @Test
        @DisplayName("Từ chối gửi tin nhắn cho chính mình")
        void rejectsSelfMessaging() {
            // Try to send message to self
            var request = new CommunicationControllerV3.SendMessageRequest(userAId, "Hello me!");
            var response = controller.sendMessage(userA, request);

            assertThat(response.getStatusCode().value()).isEqualTo(400);
            assertThat(response.getBody().getMessage()).contains("chính mình");

            // Verify use case was never called
            verify(sendMessageUseCase, never()).execute(any());
        }
    }
}

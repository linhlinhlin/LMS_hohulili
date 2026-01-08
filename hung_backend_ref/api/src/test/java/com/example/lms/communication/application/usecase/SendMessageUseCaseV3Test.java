package com.example.lms.communication.application.usecase;

import com.example.lms.communication.domain.model.Conversation;
import com.example.lms.communication.domain.model.ConversationId;
import com.example.lms.communication.domain.model.Message;
import com.example.lms.communication.domain.model.MessageId;
import com.example.lms.communication.domain.repository.ConversationRepository;
import com.example.lms.communication.domain.repository.MessageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for SendMessageUseCaseV3.
 * Updated to use domain models instead of JPA entities.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("SendMessageUseCaseV3 Tests")
class SendMessageUseCaseV3Test {

    @Mock
    private MessageRepository messageRepository;
    
    @Mock
    private ConversationRepository conversationRepository;

    @InjectMocks
    private SendMessageUseCaseV3 useCase;

    @Captor
    private ArgumentCaptor<Message> messageCaptor;
    
    @Captor
    private ArgumentCaptor<Conversation> conversationCaptor;

    private SendMessageUseCaseV3.SendMessageCommand validCommand;
    private UUID senderId;
    private UUID recipientId;

    @BeforeEach
    void setUp() {
        senderId = UUID.randomUUID();
        recipientId = UUID.randomUUID();
        
        validCommand = new SendMessageUseCaseV3.SendMessageCommand(
            senderId,
            recipientId,
            "Hello, how are you?"
        );
    }

    @Nested
    @DisplayName("Existing Conversation Tests")
    class ExistingConversationTests {

        @Test
        @DisplayName("Should send message to existing conversation")
        void shouldSendMessageToExistingConversation() {
            // Given
            Conversation existingConversation = Conversation.create(senderId, recipientId);
            Message savedMessage = Message.create(existingConversation.getId(), senderId, "Hello");

            when(conversationRepository.findByParticipants(senderId, recipientId))
                .thenReturn(Optional.of(existingConversation));
            when(messageRepository.save(any(Message.class))).thenReturn(savedMessage);
            when(conversationRepository.save(any(Conversation.class))).thenReturn(existingConversation);

            // When
            UUID resultId = useCase.execute(validCommand);

            // Then
            assertThat(resultId).isNotNull();
            verify(conversationRepository).findByParticipants(senderId, recipientId);
            verify(messageRepository).save(any(Message.class));
        }

        @Test
        @DisplayName("Should update conversation last message")
        void shouldUpdateConversationLastMessage() {
            // Given
            Conversation existingConversation = Conversation.create(senderId, recipientId);
            Message savedMessage = Message.create(existingConversation.getId(), senderId, "Hello");

            when(conversationRepository.findByParticipants(senderId, recipientId))
                .thenReturn(Optional.of(existingConversation));
            when(messageRepository.save(any(Message.class))).thenReturn(savedMessage);
            when(conversationRepository.save(conversationCaptor.capture())).thenReturn(existingConversation);

            // When
            useCase.execute(validCommand);

            // Then - verify conversation save was called
            verify(conversationRepository).save(any(Conversation.class));
            Conversation saved = conversationCaptor.getValue();
            assertThat(saved.getLastMessagePreview()).isNotNull();
        }
    }

    @Nested
    @DisplayName("New Conversation Tests")
    class NewConversationTests {

        @Test
        @DisplayName("Should create new conversation if not exists")
        void shouldCreateNewConversationIfNotExists() {
            // Given
            Conversation newConversation = Conversation.create(senderId, recipientId);
            Message savedMessage = Message.create(newConversation.getId(), senderId, "Hello");

            when(conversationRepository.findByParticipants(senderId, recipientId))
                .thenReturn(Optional.empty());
            when(conversationRepository.save(any(Conversation.class)))
                .thenReturn(newConversation);
            when(messageRepository.save(any(Message.class))).thenReturn(savedMessage);

            // When
            UUID resultId = useCase.execute(validCommand);

            // Then
            assertThat(resultId).isNotNull();
            // Verify conversation save was called (once for create, once for update)
            verify(conversationRepository, times(2)).save(any(Conversation.class));
        }
    }

    @Nested
    @DisplayName("Message Content Tests")
    class MessageContentTests {

        @Test
        @DisplayName("Should truncate long message preview")
        void shouldTruncateLongMessagePreview() {
            // Given
            String longMessage = "This is a very long message that should be truncated to fit the preview field which has a maximum length of 50 characters plus ellipsis";
            SendMessageUseCaseV3.SendMessageCommand longCommand = 
                new SendMessageUseCaseV3.SendMessageCommand(senderId, recipientId, longMessage);

            Conversation conversation = Conversation.create(senderId, recipientId);
            Message savedMessage = Message.create(conversation.getId(), senderId, longMessage);

            when(conversationRepository.findByParticipants(senderId, recipientId))
                .thenReturn(Optional.of(conversation));
            when(messageRepository.save(any(Message.class))).thenReturn(savedMessage);
            when(conversationRepository.save(conversationCaptor.capture())).thenReturn(conversation);

            // When
            useCase.execute(longCommand);

            // Then
            Conversation saved = conversationCaptor.getValue();
            assertThat(saved.getLastMessagePreview().length()).isLessThanOrEqualTo(53); // 50 + "..."
            assertThat(saved.getLastMessagePreview()).endsWith("...");
        }

        @Test
        @DisplayName("Should save message with correct content")
        void shouldSaveMessageWithCorrectContent() {
            // Given
            Conversation conversation = Conversation.create(senderId, recipientId);
            Message savedMessage = Message.create(conversation.getId(), senderId, "Hello, how are you?");

            when(conversationRepository.findByParticipants(senderId, recipientId))
                .thenReturn(Optional.of(conversation));
            when(messageRepository.save(messageCaptor.capture())).thenReturn(savedMessage);
            when(conversationRepository.save(any(Conversation.class))).thenReturn(conversation);

            // When
            useCase.execute(validCommand);

            // Then
            Message captured = messageCaptor.getValue();
            assertThat(captured.getContent()).isEqualTo("Hello, how are you?");
            assertThat(captured.getSenderId()).isEqualTo(senderId);
            assertThat(captured.isRead()).isFalse();
        }
    }
}

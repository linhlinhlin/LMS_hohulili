package com.example.lms.config;

import com.example.lms.communication.domain.model.Conversation;
import com.example.lms.communication.domain.model.ConversationId;
import com.example.lms.communication.domain.repository.ConversationRepository;
import com.example.lms.identity.infrastructure.security.JwtService;
import com.example.lms.identity.infrastructure.security.UserDetailsServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WebSocketAuthInterceptorTest {

    @Mock private JwtService jwtService;
    @Mock private UserDetailsServiceImpl userDetailsService;
    @Mock private ConversationRepository conversationRepository;

    private WebSocketAuthInterceptor interceptor;

    @BeforeEach
    void setUp() {
        interceptor = new WebSocketAuthInterceptor(jwtService, userDetailsService, conversationRepository);
    }

    @Test
    @DisplayName("Authenticates an access token on CONNECT")
    void authenticatesAccessTokenOnConnect() {
        UserDetails userDetails = testUserDetails();
        when(jwtService.extractUsername("access-token")).thenReturn(userDetails.getUsername());
        when(userDetailsService.loadUserByUsername(userDetails.getUsername())).thenReturn(userDetails);
        when(jwtService.isTokenValid("access-token", userDetails)).thenReturn(true);
        when(jwtService.isAccessToken("access-token")).thenReturn(true);

        Message<byte[]> message = connectMessage("access-token");

        interceptor.preSend(message, null);

        assertThat(StompHeaderAccessor.getAccessor(message, StompHeaderAccessor.class).getUser())
                .isNotNull()
                .extracting(java.security.Principal::getName)
                .isEqualTo(userDetails.getUsername());
    }

    @Test
    @DisplayName("Does not authenticate a refresh token on CONNECT")
    void doesNotAuthenticateRefreshTokenOnConnect() {
        UserDetails userDetails = testUserDetails();
        when(jwtService.extractUsername("refresh-token")).thenReturn(userDetails.getUsername());
        when(userDetailsService.loadUserByUsername(userDetails.getUsername())).thenReturn(userDetails);
        when(jwtService.isTokenValid("refresh-token", userDetails)).thenReturn(true);
        when(jwtService.isAccessToken("refresh-token")).thenReturn(false);

        Message<byte[]> message = connectMessage("refresh-token");

        interceptor.preSend(message, null);

        assertThat(StompHeaderAccessor.getAccessor(message, StompHeaderAccessor.class).getUser()).isNull();
    }

    @Test
    @DisplayName("Allows a participant to subscribe to their conversation topic")
    void allowsParticipantConversationSubscription() {
        UUID userId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();
        UUID conversationId = UUID.randomUUID();
        when(conversationRepository.findById(ConversationId.of(conversationId)))
                .thenReturn(Optional.of(conversation(conversationId, userId, otherUserId)));

        Message<byte[]> message = subscribeMessage(userId, "/topic/conversation/" + conversationId);

        assertThat(interceptor.preSend(message, null)).isSameAs(message);
    }

    @Test
    @DisplayName("Rejects a non-participant subscription to a private conversation topic")
    void rejectsForeignConversationSubscription() {
        UUID userId = UUID.randomUUID();
        UUID participantA = UUID.randomUUID();
        UUID participantB = UUID.randomUUID();
        UUID conversationId = UUID.randomUUID();
        when(conversationRepository.findById(ConversationId.of(conversationId)))
                .thenReturn(Optional.of(conversation(conversationId, participantA, participantB)));

        Message<byte[]> message = subscribeMessage(userId, "/topic/conversation/" + conversationId);

        assertThatThrownBy(() -> interceptor.preSend(message, null))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("Rejects unauthenticated subscription to a private conversation topic")
    void rejectsUnauthenticatedConversationSubscription() {
        UUID conversationId = UUID.randomUUID();
        Message<byte[]> message = subscribeMessage(null, "/topic/conversation/" + conversationId);

        assertThatThrownBy(() -> interceptor.preSend(message, null))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("Leaves unrelated STOMP destinations unchanged")
    void leavesUnrelatedDestinationsUnchanged() {
        Message<byte[]> message = subscribeMessage(
                UUID.randomUUID(),
                "/topic/announcements/course/" + UUID.randomUUID()
        );

        assertThat(interceptor.preSend(message, null)).isSameAs(message);
    }

    private Message<byte[]> subscribeMessage(UUID userId, String destination) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination(destination);
        if (userId != null) {
            accessor.setUser(new UsernamePasswordAuthenticationToken(userId.toString(), null));
        }
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    private Message<byte[]> connectMessage(String token) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setNativeHeader("Authorization", "Bearer " + token);
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    private UserDetails testUserDetails() {
        return User.withUsername("student@maritime.edu")
                .password("ignored")
                .authorities("ROLE_STUDENT")
                .build();
    }

    private Conversation conversation(UUID conversationId, UUID participant1, UUID participant2) {
        return Conversation.reconstitute(
                ConversationId.of(conversationId),
                participant1,
                participant2,
                null,
                null,
                false,
                false,
                Instant.now(),
                Instant.now()
        );
    }
}

package com.example.lms.config;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.security.JwtService;
import com.example.lms.identity.infrastructure.security.UserDetailsServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.security.Principal;

/**
 * Intercepts STOMP CONNECT frames and authenticates via JWT token.
 * Token is sent as STOMP header "Authorization: Bearer <token>".
 *
 * Sets Principal.getName() = userId (UUID string) so that
 * SimpMessagingTemplate.convertAndSendToUser(userId, ...) works correctly.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    @Lazy
    private final UserDetailsServiceImpl userDetailsService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");

            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                try {
                    String username = jwtService.extractUsername(token);
                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                    if (jwtService.isTokenValid(token, userDetails) &&
                            userDetails.isEnabled() && userDetails.isAccountNonLocked()) {

                        // Use user ID as Principal name for STOMP user destinations
                        String principalName = username; // fallback to email
                        if (userDetails instanceof UserJpaEntity user) {
                            principalName = user.getId().toString();
                        }

                        StompPrincipal stompPrincipal = new StompPrincipal(principalName);
                        UsernamePasswordAuthenticationToken authToken =
                                new UsernamePasswordAuthenticationToken(
                                        userDetails, null, userDetails.getAuthorities());
                        // Set a principal whose getName() returns the user UUID
                        accessor.setUser(new StompAuthenticationToken(stompPrincipal, authToken));
                        log.debug("WebSocket authenticated: {} (id={})", username, principalName);
                    } else {
                        log.warn("WebSocket auth failed: invalid token or disabled user {}", username);
                    }
                } catch (Exception e) {
                    log.warn("WebSocket auth error: {}", e.getMessage());
                }
            }
        }

        return message;
    }

    /**
     * Simple Principal that returns user UUID as name.
     */
    private record StompPrincipal(String name) implements Principal {
        @Override
        public String getName() { return name; }
    }

    /**
     * Authentication token that delegates getName() to our StompPrincipal (UUID-based)
     * while keeping full Spring Security auth details.
     */
    private static class StompAuthenticationToken extends UsernamePasswordAuthenticationToken {
        private final StompPrincipal stompPrincipal;

        StompAuthenticationToken(StompPrincipal stompPrincipal, UsernamePasswordAuthenticationToken delegate) {
            super(delegate.getPrincipal(), delegate.getCredentials(), delegate.getAuthorities());
            this.stompPrincipal = stompPrincipal;
        }

        @Override
        public String getName() {
            return stompPrincipal.getName();
        }
    }
}

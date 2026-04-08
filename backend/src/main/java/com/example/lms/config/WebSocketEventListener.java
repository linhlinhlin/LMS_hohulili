package com.example.lms.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Tracks WebSocket session connect/disconnect for online presence.
 */
@Slf4j
@Component
public class WebSocketEventListener {

    /** userId → set of session IDs (a user can have multiple tabs) */
    private final Map<UUID, Set<String>> onlineUsers = new ConcurrentHashMap<>();

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        UUID userId = extractUserId(accessor);
        if (userId != null) {
            onlineUsers.computeIfAbsent(userId, k -> ConcurrentHashMap.newKeySet()).add(accessor.getSessionId());
            log.debug("WS connected: user={}, session={}", userId, accessor.getSessionId());
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        UUID userId = extractUserId(accessor);
        if (userId != null) {
            Set<String> sessions = onlineUsers.get(userId);
            if (sessions != null) {
                sessions.remove(accessor.getSessionId());
                if (sessions.isEmpty()) {
                    onlineUsers.remove(userId);
                }
            }
            log.debug("WS disconnected: user={}, session={}", userId, accessor.getSessionId());
        }
    }

    public boolean isUserOnline(UUID userId) {
        Set<String> sessions = onlineUsers.get(userId);
        return sessions != null && !sessions.isEmpty();
    }

    public Set<UUID> getOnlineUserIds() {
        return Set.copyOf(onlineUsers.keySet());
    }

    private UUID extractUserId(StompHeaderAccessor accessor) {
        // Principal.getName() returns userId (UUID string) — set by WebSocketAuthInterceptor
        if (accessor.getUser() != null) {
            try {
                return UUID.fromString(accessor.getUser().getName());
            } catch (IllegalArgumentException e) {
                log.warn("Cannot parse userId from principal: {}", accessor.getUser().getName());
            }
        }
        return null;
    }
}

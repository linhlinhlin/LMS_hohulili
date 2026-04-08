package com.example.lms.communication.application.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Broadcasts real-time events via STOMP WebSocket.
 *
 * Destinations:
 *   /topic/conversation/{conversationId} — new messages in a conversation
 *   /user/{userId}/queue/notifications   — personal notifications (unread count, etc.)
 *   /topic/announcements/course/{courseId} — course announcements
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WebSocketMessageService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Broadcast a new message to all subscribers of a conversation.
     */
    public void broadcastNewMessage(UUID conversationId, UUID messageId, UUID senderId,
                                     String senderName, String senderRole, String content) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("type", "NEW_MESSAGE");
        payload.put("messageId", messageId);
        payload.put("conversationId", conversationId);
        payload.put("senderId", senderId);
        payload.put("senderName", senderName);
        payload.put("senderRole", senderRole);
        payload.put("content", content);
        payload.put("createdAt", Instant.now());

        messagingTemplate.convertAndSend(
                "/topic/conversation/" + conversationId, payload);
        log.debug("Broadcast NEW_MESSAGE to /topic/conversation/{}", conversationId);
    }

    /**
     * Push unread count update to a specific user.
     */
    public void pushUnreadCount(UUID userId, long unreadCount) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("type", "UNREAD_COUNT");
        payload.put("unreadCount", unreadCount);
        payload.put("timestamp", Instant.now());

        messagingTemplate.convertAndSendToUser(
                userId.toString(), "/queue/notifications", payload);
        log.debug("Push UNREAD_COUNT={} to user {}", unreadCount, userId);
    }

    /**
     * Notify user that messages were read in a conversation.
     */
    public void broadcastMessagesRead(UUID conversationId, UUID readByUserId, int count) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("type", "MESSAGES_READ");
        payload.put("conversationId", conversationId);
        payload.put("readByUserId", readByUserId);
        payload.put("count", count);
        payload.put("timestamp", Instant.now());

        messagingTemplate.convertAndSend(
                "/topic/conversation/" + conversationId, payload);
    }

    /**
     * Broadcast a new announcement to all subscribers of a course.
     */
    public void broadcastAnnouncement(UUID courseId, Map<String, Object> announcementPayload) {
        messagingTemplate.convertAndSend(
                "/topic/announcements/course/" + courseId, announcementPayload);
        log.debug("Broadcast ANNOUNCEMENT to /topic/announcements/course/{}", courseId);
    }

    /**
     * Push announcement notification to a specific user.
     */
    public void pushAnnouncementNotification(UUID userId, Map<String, Object> payload) {
        messagingTemplate.convertAndSendToUser(
                userId.toString(), "/queue/announcements", payload);
    }
}

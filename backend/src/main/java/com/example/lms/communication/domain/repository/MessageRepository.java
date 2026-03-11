package com.example.lms.communication.domain.repository;

import com.example.lms.communication.domain.model.Message;
import com.example.lms.communication.domain.model.MessageId;
import com.example.lms.communication.domain.model.ConversationId;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for Message entity.
 * Domain layer port - implementations in infrastructure layer.
 */
public interface MessageRepository {

    /**
     * Save a message.
     */
    Message save(Message message);

    /**
     * Find message by ID.
     */
    Optional<Message> findById(MessageId id);

    /**
     * Find all messages in a conversation.
     */
    List<Message> findByConversationId(ConversationId conversationId);

    /**
     * Find unread messages in a conversation.
     */
    List<Message> findUnreadByConversationId(ConversationId conversationId);

    /**
     * Count unread messages for a conversation.
     */
    long countUnreadByConversationId(ConversationId conversationId);

    /**
     * Count total unread messages for a user across all active conversations.
     * Single query — avoids N+1 pattern.
     */
    long countTotalUnreadForUser(java.util.UUID userId);

    /**
     * Delete a message.
     */
    void delete(Message message);
}

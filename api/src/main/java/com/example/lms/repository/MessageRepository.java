package com.example.lms.repository;

import com.example.lms.entity.Conversation;
import com.example.lms.entity.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MessageRepository extends JpaRepository<Message, UUID> {

    /**
     * Find all messages in a conversation ordered by creation time
     */
    @Query("SELECT m FROM Message m " +
           "LEFT JOIN FETCH m.sender " +
           "LEFT JOIN FETCH m.assignmentReference " +
           "WHERE m.conversation.id = :conversationId " +
           "ORDER BY m.createdAt ASC")
    List<Message> findByConversationIdOrderByCreatedAtAsc(@Param("conversationId") UUID conversationId);

    /**
     * Find messages in a conversation with pagination
     */
    Page<Message> findByConversationOrderByCreatedAtDesc(Conversation conversation, Pageable pageable);

    /**
     * Find unread messages for a user in a conversation
     */
    @Query("SELECT m FROM Message m " +
           "WHERE m.conversation.id = :conversationId " +
           "AND m.sender.id != :userId " +
           "AND m.isRead = false")
    List<Message> findUnreadMessages(@Param("conversationId") UUID conversationId, @Param("userId") UUID userId);

    /**
     * Count unread messages in a conversation for a user
     */
    @Query("SELECT COUNT(m) FROM Message m " +
           "WHERE m.conversation.id = :conversationId " +
           "AND m.sender.id != :userId " +
           "AND m.isRead = false")
    long countUnreadInConversation(@Param("conversationId") UUID conversationId, @Param("userId") UUID userId);

    /**
     * Mark messages as read
     */
    @Modifying
    @Query("UPDATE Message m SET m.isRead = true " +
           "WHERE m.id IN :messageIds")
    int markAsRead(@Param("messageIds") List<UUID> messageIds);

    /**
     * Mark all messages in a conversation as read for a user
     */
    @Modifying
    @Query("UPDATE Message m SET m.isRead = true " +
           "WHERE m.conversation.id = :conversationId " +
           "AND m.sender.id != :userId " +
           "AND m.isRead = false")
    int markAllAsReadInConversation(@Param("conversationId") UUID conversationId, @Param("userId") UUID userId);

    /**
     * Get the last message in a conversation
     */
    @Query("SELECT m FROM Message m " +
           "WHERE m.conversation.id = :conversationId " +
           "ORDER BY m.createdAt DESC " +
           "LIMIT 1")
    Message findLastMessage(@Param("conversationId") UUID conversationId);

    /**
     * Search messages by content
     */
    @Query("SELECT m FROM Message m " +
           "JOIN m.conversation c " +
           "WHERE (c.teacher.id = :userId OR c.student.id = :userId) " +
           "AND LOWER(m.content) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "ORDER BY m.createdAt DESC")
    List<Message> searchMessages(@Param("userId") UUID userId, @Param("query") String query);
}

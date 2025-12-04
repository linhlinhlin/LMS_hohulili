package com.example.lms.repository;

import com.example.lms.entity.ChatMessage;
import com.example.lms.entity.ChatSession;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Repository cho ChatMessage entity.
 * Chuẩn bị sẵn cho tích hợp AI Chatbot Backend Proxy.
 */
@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    /**
     * Tìm tất cả messages của session, sắp xếp theo thời gian
     */
    List<ChatMessage> findBySessionOrderByCreatedAtAsc(ChatSession session);

    /**
     * Tìm messages của session với pagination
     */
    Page<ChatMessage> findBySessionOrderByCreatedAtAsc(ChatSession session, Pageable pageable);

    /**
     * Đếm số messages trong session
     */
    long countBySession(ChatSession session);

    /**
     * Tìm message cuối cùng của session
     */
    @Query("SELECT m FROM ChatMessage m WHERE m.session = :session ORDER BY m.createdAt DESC LIMIT 1")
    ChatMessage findLastMessageBySession(@Param("session") ChatSession session);

    /**
     * Tìm messages theo session ID
     */
    List<ChatMessage> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);

    /**
     * Đếm tổng số messages của user (qua sessions)
     */
    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.session.user.id = :userId AND m.session.isDeleted = false")
    long countByUserId(@Param("userId") UUID userId);

    /**
     * Tìm messages trong khoảng thời gian (cho analytics)
     */
    @Query("SELECT m FROM ChatMessage m WHERE m.session.user.id = :userId AND m.createdAt BETWEEN :start AND :end ORDER BY m.createdAt ASC")
    List<ChatMessage> findByUserIdAndCreatedAtBetween(
        @Param("userId") UUID userId,
        @Param("start") Instant start,
        @Param("end") Instant end
    );
}

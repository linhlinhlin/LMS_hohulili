package com.example.lms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Entity lưu trữ tin nhắn trong phiên chat AI.
 * Hỗ trợ lưu trữ analytics data từ AI Service.
 * 
 * Updated: 10/12/2025 - Thêm analytics columns theo yêu cầu từ Team AI
 */
@Entity
@Table(name = "chat_messages", indexes = {
    @Index(name = "idx_chat_message_session", columnList = "session_id"),
    @Index(name = "idx_chat_message_created", columnList = "created_at"),
    @Index(name = "idx_chat_message_query_type", columnList = "query_type")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private ChatSession session;

    @Column(name = "content", columnDefinition = "TEXT", nullable = false)
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "sender_type", nullable = false)
    private SenderType senderType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private MessageStatus status = MessageStatus.SENT;

    /**
     * JSON array of sources từ AI response.
     * Format: [{"title": "...", "content": "...", "imageUrl": "...", "boundingBoxes": [...]}]
     */
    @Column(name = "sources", columnDefinition = "TEXT")
    private String sources;

    /**
     * Thời gian xử lý của AI (seconds)
     */
    @Column(name = "processing_time")
    private Double processingTime;

    /**
     * Model AI đã sử dụng
     */
    @Column(name = "ai_model", length = 100)
    private String aiModel;

    // ========== Analytics Fields (Added 10/12/2025) ==========
    
    /**
     * JSON array of topics accessed in this message.
     * Extracted từ source titles bởi AI Service.
     * Example: ["Điều 15", "Chủ tàu", "Luật Hàng hải 2015"]
     */
    @Column(name = "topics_accessed", columnDefinition = "TEXT")
    private String topicsAccessed;

    /**
     * AI confidence score for this response (0.5-1.0).
     * Dựa trên số sources tìm được và relevance.
     */
    @Column(name = "confidence_score")
    private Double confidenceScore;

    /**
     * JSON array of document IDs used for RAG.
     * Example: ["luat-hang-hai-2015-p1", "colregs-2024"]
     */
    @Column(name = "document_ids_used", columnDefinition = "TEXT")
    private String documentIdsUsed;

    /**
     * Type of query classification.
     * Values: "factual", "conceptual", "procedural"
     */
    @Column(name = "query_type", length = 50)
    private String queryType;

    // ========== Timestamps ==========

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    /**
     * Loại người gửi tin nhắn
     */
    public enum SenderType {
        USER,   // Tin nhắn từ user
        AI      // Tin nhắn từ AI
    }

    /**
     * Trạng thái tin nhắn
     */
    public enum MessageStatus {
        SENDING,    // Đang gửi
        SENT,       // Đã gửi thành công
        ERROR       // Lỗi
    }
}

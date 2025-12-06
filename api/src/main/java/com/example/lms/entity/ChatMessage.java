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
 * Chuẩn bị sẵn cho tích hợp AI Chatbot Backend Proxy.
 * 
 * Note: Entity này được tạo trước để chuẩn bị infrastructure.
 * Sẽ được sử dụng khi team AI Backend hoàn thành điều chỉnh.
 */
@Entity
@Table(name = "chat_messages", indexes = {
    @Index(name = "idx_chat_message_session", columnList = "session_id"),
    @Index(name = "idx_chat_message_created", columnList = "created_at")
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
     * Format: [{"title": "...", "content": "...", "url": "..."}]
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

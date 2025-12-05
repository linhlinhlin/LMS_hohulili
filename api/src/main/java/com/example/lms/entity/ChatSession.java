package com.example.lms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Entity lưu trữ phiên chat AI của user.
 * Chuẩn bị sẵn cho tích hợp AI Chatbot Backend Proxy.
 * 
 * Note: Entity này được tạo trước để chuẩn bị infrastructure.
 * Sẽ được sử dụng khi team AI Backend hoàn thành điều chỉnh.
 */
@Entity
@Table(name = "chat_sessions", indexes = {
    @Index(name = "idx_chat_session_user", columnList = "user_id"),
    @Index(name = "idx_chat_session_created", columnList = "created_at")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "title", length = 255)
    private String title;

    @Column(name = "context_course_id")
    private UUID contextCourseId;

    @Column(name = "context_lesson_id")
    private UUID contextLessonId;

    @Column(name = "is_deleted")
    @Builder.Default
    private boolean isDeleted = false;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    @Builder.Default
    private List<ChatMessage> messages = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    /**
     * Thêm message vào session
     */
    public void addMessage(ChatMessage message) {
        messages.add(message);
        message.setSession(this);
    }

    /**
     * Tạo title tự động từ message đầu tiên
     */
    public void generateTitleFromFirstMessage() {
        if (title == null && !messages.isEmpty()) {
            String firstContent = messages.get(0).getContent();
            if (firstContent != null && firstContent.length() > 50) {
                title = firstContent.substring(0, 47) + "...";
            } else {
                title = firstContent;
            }
        }
    }
}

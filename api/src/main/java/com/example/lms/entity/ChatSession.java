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
    private boolean isDeleted = false;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    private List<ChatMessage> messages = new ArrayList<>();

    public ChatSession() {}

    public ChatSession(UUID id, User user, String title, UUID contextCourseId, UUID contextLessonId, boolean isDeleted, Instant createdAt, Instant updatedAt, List<ChatMessage> messages) {
        this.id = id;
        this.user = user;
        this.title = title;
        this.contextCourseId = contextCourseId;
        this.contextLessonId = contextLessonId;
        this.isDeleted = isDeleted;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.messages = messages != null ? messages : new ArrayList<>();
    }

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

    // Manual Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public UUID getContextCourseId() { return contextCourseId; }
    public void setContextCourseId(UUID contextCourseId) { this.contextCourseId = contextCourseId; }
    public UUID getContextLessonId() { return contextLessonId; }
    public void setContextLessonId(UUID contextLessonId) { this.contextLessonId = contextLessonId; }
    public boolean isDeleted() { return isDeleted; }
    public void setDeleted(boolean isDeleted) { this.isDeleted = isDeleted; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public List<ChatMessage> getMessages() { return messages; }
    public void setMessages(List<ChatMessage> messages) { this.messages = messages; }
    // Manual Builder
    public static ChatSessionBuilder builder() { return new ChatSessionBuilder(); }
    public static class ChatSessionBuilder {
        private ChatSession session = new ChatSession();
        public ChatSessionBuilder id(UUID id) { session.setId(id); return this; }
        public ChatSessionBuilder user(User u) { session.setUser(u); return this; }
        public ChatSessionBuilder title(String t) { session.setTitle(t); return this; }
        public ChatSessionBuilder contextCourseId(UUID c) { session.setContextCourseId(c); return this; }
        public ChatSessionBuilder contextLessonId(UUID l) { session.setContextLessonId(l); return this; }
        public ChatSessionBuilder isDeleted(boolean d) { session.setDeleted(d); return this; }
        public ChatSessionBuilder createdAt(Instant c) { session.setCreatedAt(c); return this; }
        public ChatSessionBuilder updatedAt(Instant u) { session.setUpdatedAt(u); return this; }
        public ChatSessionBuilder messages(List<ChatMessage> m) { session.setMessages(m); return this; }
        public ChatSession build() { return session; }
    }
}

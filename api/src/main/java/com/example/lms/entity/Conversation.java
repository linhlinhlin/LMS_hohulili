package com.example.lms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Conversation Entity
 * 
 * Represents a conversation between a teacher and a student.
 * Each conversation is unique per teacher-student pair.
 */
@Entity
@Table(name = "conversations", 
    uniqueConstraints = @UniqueConstraint(columnNames = {"teacher_id", "student_id"}),
    indexes = {
        @Index(name = "idx_conversation_teacher", columnList = "teacher_id"),
        @Index(name = "idx_conversation_student", columnList = "student_id"),
        @Index(name = "idx_conversation_updated", columnList = "updated_at")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @Column(name = "is_archived_by_teacher")
    @Builder.Default
    private Boolean isArchivedByTeacher = false;

    @Column(name = "is_archived_by_student")
    @Builder.Default
    private Boolean isArchivedByStudent = false;

    @OneToMany(mappedBy = "conversation", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    @Builder.Default
    private List<Message> messages = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // Manual Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public User getTeacher() { return teacher; }
    public void setTeacher(User teacher) { this.teacher = teacher; }
    public User getStudent() { return student; }
    public void setStudent(User student) { this.student = student; }
    public Boolean getIsArchivedByTeacher() { return isArchivedByTeacher; }
    public void setIsArchivedByTeacher(Boolean isArchivedByTeacher) { this.isArchivedByTeacher = isArchivedByTeacher; }
    public Boolean getIsArchivedByStudent() { return isArchivedByStudent; }
    public void setIsArchivedByStudent(Boolean isArchivedByStudent) { this.isArchivedByStudent = isArchivedByStudent; }
    public List<Message> getMessages() { return messages; }
    public void setMessages(List<Message> messages) { this.messages = messages; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    // Manual Builder
    public static ConversationBuilder builder() { return new ConversationBuilder(); }
    public static class ConversationBuilder {
        private Conversation c = new Conversation();
        public ConversationBuilder id(UUID id) { c.setId(id); return this; }
        public ConversationBuilder teacher(User teacher) { c.setTeacher(teacher); return this; }
        public ConversationBuilder student(User student) { c.setStudent(student); return this; }
        public ConversationBuilder isArchivedByTeacher(Boolean isArchivedByTeacher) { c.setIsArchivedByTeacher(isArchivedByTeacher); return this; }
        public ConversationBuilder isArchivedByStudent(Boolean isArchivedByStudent) { c.setIsArchivedByStudent(isArchivedByStudent); return this; }
        public ConversationBuilder messages(List<Message> messages) { c.setMessages(messages); return this; }
        public ConversationBuilder createdAt(LocalDateTime createdAt) { c.setCreatedAt(createdAt); return this; }
        public ConversationBuilder updatedAt(LocalDateTime updatedAt) { c.setUpdatedAt(updatedAt); return this; }
        public Conversation build() { return c; }
    }

    /**
     * Get the other participant in the conversation
     */
    public User getOtherParticipant(UUID currentUserId) {
        if (teacher.getId().equals(currentUserId)) {
            return student;
        }
        return teacher;
    }

    /**
     * Check if conversation is archived for a specific user
     */
    public boolean isArchivedFor(UUID userId) {
        if (teacher.getId().equals(userId)) {
            return Boolean.TRUE.equals(isArchivedByTeacher);
        }
        return Boolean.TRUE.equals(isArchivedByStudent);
    }
}

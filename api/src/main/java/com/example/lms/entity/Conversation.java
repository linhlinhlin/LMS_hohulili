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

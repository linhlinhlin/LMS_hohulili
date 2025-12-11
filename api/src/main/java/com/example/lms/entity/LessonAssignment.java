package com.example.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "lesson_assignments", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"lesson_id", "assignment_id"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LessonAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lesson_id", nullable = false)
    private Lesson lesson;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "assignment_id", nullable = false)
    private Assignment assignment;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    // Manual Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Lesson getLesson() { return lesson; }
    public void setLesson(Lesson lesson) { this.lesson = lesson; }
    public Assignment getAssignment() { return assignment; }
    public void setAssignment(Assignment assignment) { this.assignment = assignment; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    // Manual Builder
    public static LessonAssignmentBuilder builder() { return new LessonAssignmentBuilder(); }
    public static class LessonAssignmentBuilder {
        private Lesson lesson;
        private Assignment assignment;
        public LessonAssignmentBuilder lesson(Lesson l) { this.lesson = l; return this; }
        public LessonAssignmentBuilder assignment(Assignment a) { this.assignment = a; return this; }
        public LessonAssignment build() {
            LessonAssignment la = new LessonAssignment();
            la.setLesson(lesson);
            la.setAssignment(assignment);
            return la;
        }
    }
}

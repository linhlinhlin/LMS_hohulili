package com.example.lms.learning_delivery.infrastructure.persistence.entity;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "video_progress")
public class VideoProgressJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "student_id", nullable = false)
    private UUID studentId;

    @Column(name = "lesson_id", nullable = false)
    private UUID lessonId;

    @Column(name = "section_id", nullable = false)
    private String sectionId;

    @Column(name = "duration_seconds", nullable = false)
    private int durationSeconds;

    @Column(name = "watched_segments", columnDefinition = "bytea")
    private byte[] watchedSegments;

    @Column(name = "watched_seconds", nullable = false)
    private int watchedSeconds;

    @Column(name = "progress_percent", nullable = false)
    private double progressPercent;

    @Column(name = "completed", nullable = false)
    private boolean completed;

    @Column(name = "last_position", nullable = false)
    private double lastPosition;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public VideoProgressJpaEntity() {}

    // Getters and setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getStudentId() { return studentId; }
    public void setStudentId(UUID studentId) { this.studentId = studentId; }

    public UUID getLessonId() { return lessonId; }
    public void setLessonId(UUID lessonId) { this.lessonId = lessonId; }

    public String getSectionId() { return sectionId; }
    public void setSectionId(String sectionId) { this.sectionId = sectionId; }

    public int getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(int durationSeconds) { this.durationSeconds = durationSeconds; }

    public byte[] getWatchedSegments() { return watchedSegments; }
    public void setWatchedSegments(byte[] watchedSegments) { this.watchedSegments = watchedSegments; }

    public int getWatchedSeconds() { return watchedSeconds; }
    public void setWatchedSeconds(int watchedSeconds) { this.watchedSeconds = watchedSeconds; }

    public double getProgressPercent() { return progressPercent; }
    public void setProgressPercent(double progressPercent) { this.progressPercent = progressPercent; }

    public boolean isCompleted() { return completed; }
    public void setCompleted(boolean completed) { this.completed = completed; }

    public double getLastPosition() { return lastPosition; }
    public void setLastPosition(double lastPosition) { this.lastPosition = lastPosition; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}

package com.example.lms.assessment.domain.model;

import java.time.Instant;
import java.util.UUID;

/**
 * Assignment Domain Model - Aggregate Root.
 * 
 * Represents a learning assignment that students must complete.
 */
public class Assignment {

    private AssignmentId id;
    private UUID lessonId;
    private UUID courseId;
    private String title;
    private String description;
    private String instructions;
    private AssignmentType type;
    private AssignmentStatus status;
    private Instant dueDate;
    private Integer maxScore;
    private Instant createdAt;
    private Instant updatedAt;

    // Private constructor for Builder
    private Assignment(AssignmentId id, UUID lessonId, UUID courseId, String title, String description,
                      String instructions, AssignmentType type, AssignmentStatus status,
                      Instant dueDate, Integer maxScore, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.lessonId = lessonId;
        this.courseId = courseId;
        this.title = title;
        this.description = description;
        this.instructions = instructions;
        this.type = type;
        this.status = status;
        this.dueDate = dueDate;
        this.maxScore = maxScore;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private AssignmentId id;
        private UUID lessonId;
        private UUID courseId;
        private String title;
        private String description;
        private String instructions;
        private AssignmentType type;
        private AssignmentStatus status;
        private Instant dueDate;
        private Integer maxScore;
        private Instant createdAt;
        private Instant updatedAt;

        public Builder id(AssignmentId id) { this.id = id; return this; }
        public Builder lessonId(UUID lessonId) { this.lessonId = lessonId; return this; }
        public Builder courseId(UUID courseId) { this.courseId = courseId; return this; }
        public Builder title(String title) { this.title = title; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder instructions(String instructions) { this.instructions = instructions; return this; }
        public Builder type(AssignmentType type) { this.type = type; return this; }
        public Builder status(AssignmentStatus status) { this.status = status; return this; }
        public Builder dueDate(Instant dueDate) { this.dueDate = dueDate; return this; }
        public Builder maxScore(Integer maxScore) { this.maxScore = maxScore; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(Instant updatedAt) { this.updatedAt = updatedAt; return this; }

        public Assignment build() {
            return new Assignment(id, lessonId, courseId, title, description, instructions, type, status, dueDate, maxScore, createdAt, updatedAt);
        }
    }

    public enum AssignmentType {
        ESSAY,
        FILE_UPLOAD,
        PROJECT,
        PRESENTATION
    }

    public enum AssignmentStatus {
        DRAFT,
        PUBLISHED,
        CLOSED
    }

    // ============ Factory Methods ============

    public static Assignment create(
            UUID lessonId,
            String title,
            String description,
            String instructions,
            AssignmentType type,
            Integer maxScore
    ) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Assignment title is required");
        }

        return Assignment.builder()
            .id(AssignmentId.generate())
            .lessonId(lessonId)
            .title(title)
            .description(description)
            .instructions(instructions)
            .type(type != null ? type : AssignmentType.ESSAY)
            .status(AssignmentStatus.DRAFT)
            .maxScore(maxScore != null ? maxScore : 100)
            .createdAt(Instant.now())
            .updatedAt(Instant.now())
            .build();
    }

    public static Assignment reconstitute(
            AssignmentId id,
            UUID lessonId,
            UUID courseId,
            String title,
            String description,
            String instructions,
            AssignmentType type,
            AssignmentStatus status,
            Instant dueDate,
            Integer maxScore,
            Instant createdAt,
            Instant updatedAt
    ) {
        return Assignment.builder()
            .id(id)
            .lessonId(lessonId)
            .courseId(courseId)
            .title(title)
            .description(description)
            .instructions(instructions)
            .type(type)
            .status(status)
            .dueDate(dueDate)
            .maxScore(maxScore)
            .createdAt(createdAt)
            .updatedAt(updatedAt)
            .build();
    }

    // ============ Business Methods ============

    public void publish() {
        if (this.status == AssignmentStatus.CLOSED) {
            throw new IllegalStateException("Cannot publish a closed assignment");
        }
        this.status = AssignmentStatus.PUBLISHED;
        this.updatedAt = Instant.now();
    }

    public void close() {
        this.status = AssignmentStatus.CLOSED;
        this.updatedAt = Instant.now();
    }

    public void setDueDate(Instant dueDate) {
        if (dueDate != null && dueDate.isBefore(Instant.now())) {
            throw new IllegalArgumentException("Due date must be in the future");
        }
        this.dueDate = dueDate;
        this.updatedAt = Instant.now();
    }

    public void updateInfo(String title, String description, String instructions) {
        if (title != null && !title.isBlank()) {
            this.title = title;
        }
        if (description != null) {
            this.description = description;
        }
        if (instructions != null) {
            this.instructions = instructions;
        }
        this.updatedAt = Instant.now();
    }

    public boolean isOpen() {
        return this.status == AssignmentStatus.PUBLISHED && 
               (this.dueDate == null || this.dueDate.isAfter(Instant.now()));
    }

    public boolean isEditable() {
        return this.status == AssignmentStatus.DRAFT;
    }

    // Getters
    public AssignmentId getId() { return id; }
    public UUID getLessonId() { return lessonId; }
    public UUID getCourseId() { return courseId; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getInstructions() { return instructions; }
    public AssignmentType getType() { return type; }
    public AssignmentStatus getStatus() { return status; }
    public Instant getDueDate() { return dueDate; }
    public Integer getMaxScore() { return maxScore; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}

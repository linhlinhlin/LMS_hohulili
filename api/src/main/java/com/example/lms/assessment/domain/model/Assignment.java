package com.example.lms.assessment.domain.model;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

/**
 * Assignment Domain Model - Aggregate Root.
 * 
 * Represents a learning assignment that students must complete.
 */
@Getter
@Builder
public class Assignment {

    private AssignmentId id;
    private UUID lessonId;
    private String title;
    private String description;
    private String instructions;
    private AssignmentType type;
    private AssignmentStatus status;
    private Instant dueDate;
    private Integer maxScore;
    private Instant createdAt;
    private Instant updatedAt;

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
        if (lessonId == null) {
            throw new IllegalArgumentException("Lesson ID is required");
        }
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
}

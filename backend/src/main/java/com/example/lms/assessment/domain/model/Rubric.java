package com.example.lms.assessment.domain.model;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Rubric - Aggregate Root for grading rubrics.
 *
 * Supports library mode (assignmentId = null) and assigned mode.
 * Teachers create rubrics independently, then assign to assignments.
 */
public class Rubric {
    private UUID id;
    private UUID teacherId;
    private UUID assignmentId; // Nullable: null = library rubric, non-null = assigned
    private String title;
    private String description;
    private Double maxPoints;
    private List<Criterion> criteria;
    private Instant createdAt;
    private Instant updatedAt;

    private Rubric() {}

    // Factory method
    public static Rubric create(UUID teacherId, String title, String description,
                                Double maxPoints, List<Criterion> criteria) {
        if (teacherId == null) throw new IllegalArgumentException("ID giáo viên là bắt buộc");
        if (title == null || title.isBlank()) throw new IllegalArgumentException("Tiêu đề là bắt buộc");
        if (criteria == null || criteria.isEmpty()) throw new IllegalArgumentException("Cần có ít nhất một tiêu chí");

        Rubric rubric = new Rubric();
        rubric.id = UUID.randomUUID();
        rubric.teacherId = teacherId;
        rubric.title = title;
        rubric.description = description;
        rubric.maxPoints = maxPoints != null ? maxPoints : 100.0;
        rubric.criteria = new ArrayList<>(criteria);
        rubric.createdAt = Instant.now();
        rubric.updatedAt = Instant.now();
        return rubric;
    }

    // Reconstitution from persistence
    public static Rubric reconstitute(UUID id, UUID teacherId, UUID assignmentId,
                                       String title, String description, Double maxPoints,
                                       List<Criterion> criteria, Instant createdAt, Instant updatedAt) {
        Rubric rubric = new Rubric();
        rubric.id = id;
        rubric.teacherId = teacherId;
        rubric.assignmentId = assignmentId;
        rubric.title = title;
        rubric.description = description;
        rubric.maxPoints = maxPoints;
        rubric.criteria = criteria != null ? new ArrayList<>(criteria) : new ArrayList<>();
        rubric.createdAt = createdAt;
        rubric.updatedAt = updatedAt;
        return rubric;
    }

    // Commands
    public void update(String title, String description, Double maxPoints, List<Criterion> criteria) {
        if (title == null || title.isBlank()) throw new IllegalArgumentException("Tiêu đề là bắt buộc");
        if (criteria == null || criteria.isEmpty()) throw new IllegalArgumentException("Cần có ít nhất một tiêu chí");

        this.title = title;
        this.description = description;
        this.maxPoints = maxPoints != null ? maxPoints : this.maxPoints;
        this.criteria = new ArrayList<>(criteria);
        this.updatedAt = Instant.now();
    }

    public void assignTo(UUID assignmentId) {
        if (assignmentId == null) throw new IllegalArgumentException("ID bài tập là bắt buộc");
        this.assignmentId = assignmentId;
        this.updatedAt = Instant.now();
    }

    public void unassign() {
        this.assignmentId = null;
        this.updatedAt = Instant.now();
    }

    public boolean isAssigned() {
        return this.assignmentId != null;
    }

    // Getters
    public UUID getId() { return id; }
    public UUID getTeacherId() { return teacherId; }
    public UUID getAssignmentId() { return assignmentId; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public Double getMaxPoints() { return maxPoints; }
    public List<Criterion> getCriteria() { return criteria; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    // Value objects
    public record Criterion(String name, String description, Double maxPoints, List<Level> levels) {
        public Criterion {
            if (name == null || name.isBlank()) throw new IllegalArgumentException("Tên tiêu chí là bắt buộc");
        }
    }

    public record Level(String label, String description, Double points) {
        public Level {
            if (label == null || label.isBlank()) throw new IllegalArgumentException("Nhãn mức độ là bắt buộc");
        }
    }
}

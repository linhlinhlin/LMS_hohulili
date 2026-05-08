package com.example.lms.competency_mapping.infrastructure.persistence.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "lesson_competency_mappings",
       uniqueConstraints = @UniqueConstraint(columnNames = {"lesson_id", "competency_id"}))
public class LessonCompetencyMappingJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "lesson_id", nullable = false)
    private UUID lessonId;

    @Column(name = "competency_id", nullable = false)
    private UUID competencyId;

    @Column(name = "mapped_by")
    private UUID mappedBy;

    @CreationTimestamp
    @Column(name = "mapped_at", nullable = false, updatable = false)
    private Instant mappedAt;

    @Column(columnDefinition = "TEXT")
    private String note;

    public LessonCompetencyMappingJpaEntity() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getLessonId() { return lessonId; }
    public void setLessonId(UUID lessonId) { this.lessonId = lessonId; }
    public UUID getCompetencyId() { return competencyId; }
    public void setCompetencyId(UUID competencyId) { this.competencyId = competencyId; }
    public UUID getMappedBy() { return mappedBy; }
    public void setMappedBy(UUID mappedBy) { this.mappedBy = mappedBy; }
    public Instant getMappedAt() { return mappedAt; }
    public void setMappedAt(Instant mappedAt) { this.mappedAt = mappedAt; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}

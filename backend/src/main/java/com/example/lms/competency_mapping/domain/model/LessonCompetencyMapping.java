package com.example.lms.competency_mapping.domain.model;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public class LessonCompetencyMapping {

    private final UUID id;
    private final UUID lessonId;
    private final UUID competencyId;
    private final UUID mappedBy;
    private final Instant mappedAt;
    private String note;

    private LessonCompetencyMapping(UUID id, UUID lessonId, UUID competencyId,
                                     UUID mappedBy, Instant mappedAt, String note) {
        this.id = id;
        this.lessonId = lessonId;
        this.competencyId = competencyId;
        this.mappedBy = mappedBy;
        this.mappedAt = mappedAt;
        this.note = note;
    }

    public static LessonCompetencyMapping create(UUID lessonId, UUID competencyId,
                                                  UUID mappedBy, String note) {
        Objects.requireNonNull(lessonId, "lessonId is required");
        Objects.requireNonNull(competencyId, "competencyId is required");
        return new LessonCompetencyMapping(UUID.randomUUID(), lessonId, competencyId,
                mappedBy, Instant.now(), note);
    }

    public static LessonCompetencyMapping reconstitute(UUID id, UUID lessonId, UUID competencyId,
                                                        UUID mappedBy, Instant mappedAt, String note) {
        return new LessonCompetencyMapping(id, lessonId, competencyId, mappedBy, mappedAt, note);
    }

    public UUID getId() { return id; }
    public UUID getLessonId() { return lessonId; }
    public UUID getCompetencyId() { return competencyId; }
    public UUID getMappedBy() { return mappedBy; }
    public Instant getMappedAt() { return mappedAt; }
    public String getNote() { return note; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof LessonCompetencyMapping m)) return false;
        return Objects.equals(id, m.id);
    }

    @Override
    public int hashCode() { return Objects.hash(id); }
}

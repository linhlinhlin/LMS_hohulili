package com.example.lms.learning_delivery.domain.model;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public class LearningEvent {

    public enum EventType {
        PLAY, PAUSE, SEEK, COMPLETE, SECTION_VIEW, LESSON_COMPLETE,
        HEARTBEAT, READING_PROGRESS, INTERACTIVE_VIDEO
    }

    private UUID id;
    private UUID studentId;
    private UUID lessonId;
    private String sectionId;
    private EventType eventType;
    private Map<String, Object> eventData;
    private Instant createdAt;

    protected LearningEvent() {}

    public static LearningEvent create(UUID studentId, UUID lessonId, String sectionId,
                                        EventType eventType, Map<String, Object> eventData) {
        LearningEvent event = new LearningEvent();
        event.studentId = studentId;
        event.lessonId = lessonId;
        event.sectionId = sectionId;
        event.eventType = eventType;
        event.eventData = eventData;
        event.createdAt = Instant.now();
        return event;
    }

    // Getters
    public UUID getId() { return id; }
    public UUID getStudentId() { return studentId; }
    public UUID getLessonId() { return lessonId; }
    public String getSectionId() { return sectionId; }
    public EventType getEventType() { return eventType; }
    public Map<String, Object> getEventData() { return eventData; }
    public Instant getCreatedAt() { return createdAt; }

    // Builder for reconstitution
    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private UUID id;
        private UUID studentId;
        private UUID lessonId;
        private String sectionId;
        private EventType eventType;
        private Map<String, Object> eventData;
        private Instant createdAt;

        public Builder id(UUID v) { this.id = v; return this; }
        public Builder studentId(UUID v) { this.studentId = v; return this; }
        public Builder lessonId(UUID v) { this.lessonId = v; return this; }
        public Builder sectionId(String v) { this.sectionId = v; return this; }
        public Builder eventType(EventType v) { this.eventType = v; return this; }
        public Builder eventData(Map<String, Object> v) { this.eventData = v; return this; }
        public Builder createdAt(Instant v) { this.createdAt = v; return this; }

        public LearningEvent build() {
            LearningEvent e = new LearningEvent();
            e.id = id; e.studentId = studentId; e.lessonId = lessonId;
            e.sectionId = sectionId; e.eventType = eventType;
            e.eventData = eventData; e.createdAt = createdAt;
            return e;
        }
    }
}

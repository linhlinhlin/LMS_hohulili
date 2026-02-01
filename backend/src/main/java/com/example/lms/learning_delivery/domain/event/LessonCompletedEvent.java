package com.example.lms.learning_delivery.domain.event;

import com.example.lms.shared.domain.event.AbstractDomainEvent;
import java.util.UUID;

/**
 * Event raised when a student completes a lesson.
 */
public class LessonCompletedEvent extends AbstractDomainEvent {

    private final UUID lessonId;
    private final UUID studentId;
    private final UUID classId;
    private final int completionPercent;

    public LessonCompletedEvent(UUID enrollmentId, UUID lessonId, UUID studentId, UUID classId, int completionPercent) {
        super(enrollmentId);
        this.lessonId = lessonId;
        this.studentId = studentId;
        this.classId = classId;
        this.completionPercent = completionPercent;
    }

    public UUID getEnrollmentId() {
        return getAggregateId();
    }

    public UUID getLessonId() {
        return lessonId;
    }

    public UUID getStudentId() {
        return studentId;
    }

    public UUID getClassId() {
        return classId;
    }

    public int getCompletionPercent() {
        return completionPercent;
    }
}

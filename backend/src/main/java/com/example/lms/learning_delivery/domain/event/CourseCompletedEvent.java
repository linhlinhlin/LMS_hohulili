package com.example.lms.learning_delivery.domain.event;

import com.example.lms.shared.domain.event.AbstractDomainEvent;
import java.util.UUID;

/**
 * Event raised when a student completes a course.
 */
public class CourseCompletedEvent extends AbstractDomainEvent {

    private final UUID classId;
    private final UUID studentId;
    private final UUID courseId;

    public CourseCompletedEvent(UUID enrollmentId, UUID classId, UUID studentId, UUID courseId) {
        super(enrollmentId);
        this.classId = classId;
        this.studentId = studentId;
        this.courseId = courseId;
    }

    public UUID getEnrollmentId() {
        return getAggregateId();
    }

    public UUID getClassId() {
        return classId;
    }

    public UUID getStudentId() {
        return studentId;
    }

    public UUID getCourseId() {
        return courseId;
    }
}

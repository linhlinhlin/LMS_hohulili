package com.example.lms.learning_delivery.domain.event;

import com.example.lms.shared.domain.event.AbstractDomainEvent;
import java.util.UUID;

/**
 * Domain event raised when a student is dropped from a class.
 */
public class StudentDroppedEvent extends AbstractDomainEvent {

    private final UUID enrollmentId;
    private final UUID studentId;
    private final UUID classId;
    private final String reason;

    public StudentDroppedEvent(UUID enrollmentId, UUID studentId, UUID classId, String reason) {
        super(enrollmentId); // aggregateId is the enrollment
        this.enrollmentId = enrollmentId;
        this.studentId = studentId;
        this.classId = classId;
        this.reason = reason;
    }

    public UUID getEnrollmentId() {
        return enrollmentId;
    }

    public UUID getStudentId() {
        return studentId;
    }

    public UUID getClassId() {
        return classId;
    }

    public String getReason() {
        return reason;
    }
}

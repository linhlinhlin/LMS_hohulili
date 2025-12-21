package com.example.lms.learning_delivery.domain.event;

import com.example.lms.shared.domain.event.AbstractDomainEvent;
import com.example.lms.shared.domain.valueobject.CourseId;
import com.example.lms.shared.domain.valueobject.StudentId;

import java.util.UUID;

/**
 * Event raised when a student enrolls in a class.
 * This event is consumed by Assessment module to enable quiz access.
 */
public class StudentEnrolledEvent extends AbstractDomainEvent {

    private final UUID classId;
    private final StudentId studentId;
    private final CourseId courseId;

    public StudentEnrolledEvent(UUID enrollmentId, UUID classId, StudentId studentId, CourseId courseId) {
        super(enrollmentId);
        this.classId = classId;
        this.studentId = studentId;
        this.courseId = courseId;
    }

    /**
     * Legacy constructor for backward compatibility.
     */
    public StudentEnrolledEvent(UUID enrollmentId, UUID classId, UUID studentId, UUID courseId) {
        this(enrollmentId, classId, StudentId.of(studentId), CourseId.of(courseId));
    }

    public UUID getEnrollmentId() {
        return getAggregateId();
    }

    public UUID getClassId() {
        return classId;
    }

    public StudentId getStudentId() {
        return studentId;
    }

    public CourseId getCourseId() {
        return courseId;
    }

    /**
     * Legacy getter for backward compatibility.
     */
    public UUID getStudentIdValue() {
        return studentId.value();
    }

    /**
     * Legacy getter for backward compatibility.
     */
    public UUID getCourseIdValue() {
        return courseId.value();
    }
}

package com.example.lms.learning_delivery.domain.event;

import com.example.lms.shared.domain.event.AbstractDomainEvent;

import java.util.UUID;

/**
 * Domain event raised after a student is enrolled in a course/class.
 */
public class CourseEnrolledEvent extends AbstractDomainEvent {

    private final UUID enrollmentId;
    private final UUID studentId;
    private final UUID classId;
    private final UUID courseId;
    private final String courseName;
    private final String semester;

    public CourseEnrolledEvent(UUID enrollmentId,
                               UUID studentId,
                               UUID classId,
                               UUID courseId,
                               String courseName,
                               String semester) {
        super(enrollmentId);
        this.enrollmentId = enrollmentId;
        this.studentId = studentId;
        this.classId = classId;
        this.courseId = courseId;
        this.courseName = courseName;
        this.semester = semester;
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

    public UUID getCourseId() {
        return courseId;
    }

    public String getCourseName() {
        return courseName;
    }

    public String getSemester() {
        return semester;
    }
}

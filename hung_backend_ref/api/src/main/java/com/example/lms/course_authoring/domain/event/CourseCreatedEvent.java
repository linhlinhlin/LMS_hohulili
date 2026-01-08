package com.example.lms.course_authoring.domain.event;

import com.example.lms.shared.domain.event.AbstractDomainEvent;
import com.example.lms.shared.domain.valueobject.CourseId;
import com.example.lms.shared.domain.valueobject.TeacherId;

import java.util.UUID;

/**
 * Event raised when a new course is created.
 * Contains all metadata required for cross-module communication.
 */
public class CourseCreatedEvent extends AbstractDomainEvent {

    private final CourseId courseId;
    private final String courseCode;
    private final String courseTitle;
    private final TeacherId teacherId;

    public CourseCreatedEvent(CourseId courseId, String courseCode, String courseTitle, TeacherId teacherId) {
        super(courseId.value());
        this.courseId = courseId;
        this.courseCode = courseCode;
        this.courseTitle = courseTitle;
        this.teacherId = teacherId;
    }

    /**
     * Legacy constructor for backward compatibility.
     */
    public CourseCreatedEvent(UUID courseId, String courseCode, String courseTitle, UUID teacherId) {
        this(CourseId.of(courseId), courseCode, courseTitle, TeacherId.of(teacherId));
    }

    public CourseId getCourseId() {
        return courseId;
    }

    public String getCourseCode() {
        return courseCode;
    }

    public String getCourseTitle() {
        return courseTitle;
    }

    public TeacherId getTeacherId() {
        return teacherId;
    }

    /**
     * Legacy getter for backward compatibility.
     */
    public UUID getTeacherIdValue() {
        return teacherId.value();
    }
}

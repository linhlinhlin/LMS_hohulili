package com.example.lms.course_authoring.domain.event;

import com.example.lms.shared.domain.event.AbstractDomainEvent;
import com.example.lms.shared.domain.valueobject.CourseId;
import com.example.lms.shared.domain.valueobject.TeacherId;

import java.util.UUID;

/**
 * Event raised when a course is approved by admin.
 * Contains all metadata required for Learning Delivery module to create classes.
 */
public class CourseApprovedEvent extends AbstractDomainEvent {

    private final CourseId courseId;
    private final String courseCode;
    private final String courseTitle;
    private final TeacherId teacherId;
    private final UUID reviewerId;

    public CourseApprovedEvent(CourseId courseId, String courseCode, String courseTitle, 
                               TeacherId teacherId, UUID reviewerId) {
        super(courseId.value());
        this.courseId = courseId;
        this.courseCode = courseCode;
        this.courseTitle = courseTitle;
        this.teacherId = teacherId;
        this.reviewerId = reviewerId;
    }

    /**
     * Legacy constructor for backward compatibility.
     */
    public CourseApprovedEvent(UUID courseId, String courseCode, UUID reviewerId) {
        this(CourseId.of(courseId), courseCode, null, null, reviewerId);
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

    public UUID getReviewerId() {
        return reviewerId;
    }
}

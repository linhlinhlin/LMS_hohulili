package com.example.lms.course_authoring.domain.event;

import com.example.lms.shared.domain.event.AbstractDomainEvent;
import java.util.UUID;

/**
 * Event raised when a course is rejected by admin.
 */
public class CourseRejectedEvent extends AbstractDomainEvent {

    private final String courseCode;
    private final String courseTitle;
    private final UUID teacherId;
    private final UUID reviewerId;
    private final String reason;

    public CourseRejectedEvent(UUID courseId, String courseCode, String courseTitle,
                                UUID teacherId, UUID reviewerId, String reason) {
        super(courseId);
        this.courseCode = courseCode;
        this.courseTitle = courseTitle;
        this.teacherId = teacherId;
        this.reviewerId = reviewerId;
        this.reason = reason;
    }

    public UUID getCourseId() {
        return getAggregateId();
    }

    public String getCourseCode() {
        return courseCode;
    }

    public String getCourseTitle() {
        return courseTitle;
    }

    public UUID getTeacherId() {
        return teacherId;
    }

    public UUID getReviewerId() {
        return reviewerId;
    }

    public String getReason() {
        return reason;
    }
}

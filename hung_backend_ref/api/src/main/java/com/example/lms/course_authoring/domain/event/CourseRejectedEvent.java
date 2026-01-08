package com.example.lms.course_authoring.domain.event;

import com.example.lms.shared.domain.event.AbstractDomainEvent;
import java.util.UUID;

/**
 * Event raised when a course is rejected by admin.
 */
public class CourseRejectedEvent extends AbstractDomainEvent {

    private final String courseCode;
    private final UUID reviewerId;
    private final String reason;

    public CourseRejectedEvent(UUID courseId, String courseCode, UUID reviewerId, String reason) {
        super(courseId);
        this.courseCode = courseCode;
        this.reviewerId = reviewerId;
        this.reason = reason;
    }

    public UUID getCourseId() {
        return getAggregateId();
    }

    public String getCourseCode() {
        return courseCode;
    }

    public UUID getReviewerId() {
        return reviewerId;
    }

    public String getReason() {
        return reason;
    }
}

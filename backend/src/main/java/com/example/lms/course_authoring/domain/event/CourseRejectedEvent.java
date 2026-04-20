package com.example.lms.course_authoring.domain.event;

import com.example.lms.course_authoring.domain.model.CourseRejectionCategory;
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
    private final CourseRejectionCategory category;

    public CourseRejectedEvent(UUID courseId, String courseCode, String courseTitle,
                                UUID teacherId, UUID reviewerId, String reason) {
        this(courseId, courseCode, courseTitle, teacherId, reviewerId, reason, null);
    }

    public CourseRejectedEvent(UUID courseId, String courseCode, String courseTitle,
                                UUID teacherId, UUID reviewerId, String reason,
                                CourseRejectionCategory category) {
        super(courseId);
        this.courseCode = courseCode;
        this.courseTitle = courseTitle;
        this.teacherId = teacherId;
        this.reviewerId = reviewerId;
        this.reason = reason;
        this.category = category;
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

    public CourseRejectionCategory getCategory() {
        return category;
    }
}

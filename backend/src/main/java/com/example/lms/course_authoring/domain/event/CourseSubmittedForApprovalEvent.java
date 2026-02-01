package com.example.lms.course_authoring.domain.event;

import com.example.lms.shared.domain.event.AbstractDomainEvent;
import java.util.UUID;

/**
 * Event raised when a course is submitted for approval.
 */
public class CourseSubmittedForApprovalEvent extends AbstractDomainEvent {

    private final String courseCode;

    public CourseSubmittedForApprovalEvent(UUID courseId, String courseCode) {
        super(courseId);
        this.courseCode = courseCode;
    }

    public UUID getCourseId() {
        return getAggregateId();
    }

    public String getCourseCode() {
        return courseCode;
    }
}

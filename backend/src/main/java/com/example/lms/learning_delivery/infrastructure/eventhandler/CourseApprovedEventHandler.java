package com.example.lms.learning_delivery.infrastructure.eventhandler;

import com.example.lms.course_authoring.domain.event.CourseApprovedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Event handler that listens for CourseApprovedEvent from Course Authoring module.
 * When a course is approved, it becomes available for class creation in Learning Delivery.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class CourseApprovedEventHandler {

    @EventListener
    public void handleCourseApproved(CourseApprovedEvent event) {
        log.info("Received CourseApprovedEvent: courseId={}, courseCode={}", 
            event.getCourseId(), event.getCourseCode());
        
        // Course is now available for class creation
        // In a more complex system, we might:
        // 1. Cache the approved course info
        // 2. Notify teachers that they can create classes
        // 3. Update any pending class creation requests
        
        log.info("Course {} is now available for class creation", event.getCourseCode());
    }
}

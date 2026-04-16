package com.example.lms.learning_delivery.infrastructure.eventhandler;

import com.example.lms.course_authoring.domain.event.CourseApprovedEvent;
import com.example.lms.learning_delivery.application.usecase.GamificationUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Event handler that listens for CourseApprovedEvent from Course Authoring module.
 * When a course is approved, it becomes available for class creation in Learning Delivery,
 * and the teacher receives an in-app notification.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class CourseApprovedEventHandler {

    private final GamificationUseCase gamificationUseCase;

    @EventListener
    public void handleCourseApproved(CourseApprovedEvent event) {
        log.info("Received CourseApprovedEvent: courseId={}, courseCode={}",
            event.getCourseId(), event.getCourseCode());

        // Notify teacher that their course was approved
        if (event.getTeacherId() != null) {
            try {
                String title = "Khóa học được phê duyệt";
                String courseTitle = event.getCourseTitle() != null
                        ? event.getCourseTitle()
                        : event.getCourseCode();
                String message = "Khóa học '" + courseTitle + "' đã được phê duyệt và xuất bản thành công.";

                gamificationUseCase.createNotification(
                        event.getTeacherId().value(),
                        "COURSE_APPROVED",
                        title,
                        message,
                        "/teacher/courses"
                );
                log.info("Created approval notification for teacher {} (course: {})",
                        event.getTeacherId().value(), event.getCourseCode());
            } catch (Exception ex) {
                log.error("Failed to create approval notification for course {}: {}",
                        event.getCourseCode(), ex.getMessage());
            }
        }
    }
}

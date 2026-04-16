package com.example.lms.learning_delivery.infrastructure.eventhandler;

import com.example.lms.course_authoring.domain.event.CourseRejectedEvent;
import com.example.lms.learning_delivery.application.usecase.GamificationUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Event handler that listens for CourseRejectedEvent from Course Authoring module.
 * Sends an in-app notification to the teacher with the rejection reason.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class CourseRejectedEventHandler {

    private final GamificationUseCase gamificationUseCase;

    @EventListener
    public void handleCourseRejected(CourseRejectedEvent event) {
        log.info("Received CourseRejectedEvent: courseId={}, courseCode={}",
            event.getCourseId(), event.getCourseCode());

        if (event.getTeacherId() != null) {
            try {
                String title = "Khóa học bị từ chối";
                String courseTitle = event.getCourseTitle() != null
                        ? event.getCourseTitle()
                        : event.getCourseCode();
                String reason = event.getReason() != null ? event.getReason() : "";
                String message = "Khóa học '" + courseTitle + "' đã bị từ chối."
                        + (reason.isEmpty() ? "" : " Lý do: " + reason);

                gamificationUseCase.createNotification(
                        event.getTeacherId(),
                        "COURSE_REJECTED",
                        title,
                        message,
                        "/teacher/courses"
                );
                log.info("Created rejection notification for teacher {} (course: {})",
                        event.getTeacherId(), event.getCourseCode());
            } catch (Exception ex) {
                log.error("Failed to create rejection notification for course {}: {}",
                        event.getCourseCode(), ex.getMessage());
            }
        }
    }
}

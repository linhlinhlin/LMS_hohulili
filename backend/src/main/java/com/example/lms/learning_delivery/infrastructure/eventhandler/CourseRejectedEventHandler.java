package com.example.lms.learning_delivery.infrastructure.eventhandler;

import com.example.lms.course_authoring.domain.event.CourseRejectedEvent;
import com.example.lms.course_authoring.domain.model.CourseRejectionCategory;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.learning_delivery.application.usecase.GamificationUseCase;
import com.example.lms.shared.application.port.EmailServicePort;
import com.example.lms.shared.domain.valueobject.UserId;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Event handler for {@link CourseRejectedEvent}.
 *
 * <p>Responsibilities (Phase 3):
 * <ul>
 *   <li>Create an in-app notification with the structured category + free-text reason</li>
 *   <li>Send an email to the teacher with the same info + a deep link to the course editor</li>
 * </ul>
 *
 * <p>Failure isolation: email and notification delivery are wrapped so a downstream error
 * never rolls back the admin's reject action. Logs are the single source of truth for ops.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class CourseRejectedEventHandler {

    private final GamificationUseCase gamificationUseCase;
    private final UserRepository userRepository;
    private final EmailServicePort emailService;

    @Value("${app.email.base-url:http://localhost:4200}")
    private String baseUrl;

    @EventListener
    public void handleCourseRejected(CourseRejectedEvent event) {
        log.info("Received CourseRejectedEvent: courseId={}, courseCode={}, category={}",
                event.getCourseId(), event.getCourseCode(),
                event.getCategory() != null ? event.getCategory().name() : "OTHER");

        if (event.getTeacherId() == null) {
            return;
        }

        String courseTitle = event.getCourseTitle() != null
                ? event.getCourseTitle()
                : event.getCourseCode();
        String reason = event.getReason() != null ? event.getReason() : "";
        String categoryLabel = event.getCategory() != null
                ? event.getCategory().getDisplayName()
                : CourseRejectionCategory.OTHER.getDisplayName();

        sendInAppNotification(event, courseTitle, categoryLabel, reason);
        sendRejectionEmail(event, courseTitle, categoryLabel, reason);
    }

    private void sendInAppNotification(CourseRejectedEvent event, String courseTitle,
                                        String categoryLabel, String reason) {
        try {
            String title = "Khóa học chưa được duyệt";
            StringBuilder message = new StringBuilder()
                    .append("Khóa học \"").append(courseTitle).append("\" chưa được duyệt.")
                    .append(" Danh mục: ").append(categoryLabel).append('.');
            if (!reason.isEmpty()) {
                message.append(" Chi tiết: ").append(reason);
            }

            gamificationUseCase.createNotification(
                    event.getTeacherId(),
                    "COURSE_REJECTED",
                    title,
                    message.toString(),
                    "/teacher/courses"
            );
            log.info("Created rejection notification for teacher {} (course: {})",
                    event.getTeacherId(), event.getCourseCode());
        } catch (Exception ex) {
            log.error("Failed to create rejection notification for course {}: {}",
                    event.getCourseCode(), ex.getMessage());
        }
    }

    private void sendRejectionEmail(CourseRejectedEvent event, String courseTitle,
                                     String categoryLabel, String reason) {
        try {
            var teacher = userRepository.findById(UserId.of(event.getTeacherId())).orElse(null);
            if (teacher == null) {
                log.warn("Cannot send rejection email — teacher {} not found", event.getTeacherId());
                return;
            }
            String email = teacher.getEmail() != null ? teacher.getEmail().getValue() : null;
            if (email == null || email.isBlank()) {
                log.warn("Cannot send rejection email — teacher {} has no email", event.getTeacherId());
                return;
            }
            String courseUrl = baseUrl + "/teacher/courses/" + event.getCourseId() + "/edit";
            emailService.sendCourseRejected(
                    email,
                    teacher.getFullName(),
                    courseTitle,
                    categoryLabel,
                    reason,
                    courseUrl
            );
        } catch (Exception ex) {
            log.error("Failed to send rejection email for course {}: {}",
                    event.getCourseCode(), ex.getMessage());
        }
    }
}

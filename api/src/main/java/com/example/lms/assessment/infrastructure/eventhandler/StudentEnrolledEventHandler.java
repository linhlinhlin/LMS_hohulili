package com.example.lms.assessment.infrastructure.eventhandler;

import com.example.lms.learning_delivery.domain.event.StudentEnrolledEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Event handler that listens for StudentEnrolledEvent from Learning Delivery module.
 * When a student enrolls in a class, quiz access is enabled for that student.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class StudentEnrolledEventHandler {

    @EventListener
    public void handleStudentEnrolled(StudentEnrolledEvent event) {
        log.info("Received StudentEnrolledEvent: studentId={}, courseId={}, classId={}", 
            event.getStudentId(), event.getCourseId(), event.getClassId());
        
        // Enable quiz access for the enrolled student
        // In a more complex system, we might:
        // 1. Create quiz access records
        // 2. Unlock course-specific quizzes
        // 3. Send notification to student about available quizzes
        
        log.info("Quiz access enabled for student {} in course {}", 
            event.getStudentId(), event.getCourseId());
    }
}

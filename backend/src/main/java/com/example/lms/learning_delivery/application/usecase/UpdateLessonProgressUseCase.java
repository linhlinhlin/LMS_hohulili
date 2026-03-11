package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.learning_delivery.application.dto.EnrollmentResponse;
import com.example.lms.learning_delivery.application.dto.UpdateLessonProgressCommand;
import com.example.lms.learning_delivery.application.port.CourseLessonCountPort;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.repository.CertificateRepository;
import com.example.lms.learning_delivery.domain.repository.EnrollmentRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Use case for updating lesson progress.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UpdateLessonProgressUseCase {

    private final EnrollmentRepository enrollmentRepository;
    private final CertificateUseCase certificateUseCase;
    private final CourseLessonCountPort lessonCountPort;

    @Transactional
    public EnrollmentResponse execute(UpdateLessonProgressCommand command) {
        log.info("Updating lesson progress for enrollment {}, lesson {}", 
            command.enrollmentId(), command.lessonId());

        Enrollment enrollment = enrollmentRepository.findById(command.enrollmentId())
            .orElseThrow(() -> new EntityNotFoundException("Enrollment", command.enrollmentId()));

        // Build progress object
        Enrollment.LessonProgress progress = Enrollment.LessonProgress.builder()
            .status(command.status() != null ? command.status() : "UNLOCKED")
            .watchSeconds(command.watchSeconds())
            .grade(command.grade())
            .lastActivity(Instant.now())
            .build();

        // Update progress using domain method
        enrollment.updateProgress(command.lessonId().toString(), progress);
        
        // Recalculate completion percentage
        recalculateCompletion(enrollment);

        // Auto-complete enrollment when all lessons done (SOTA: Canvas/Coursera pattern)
        if (enrollment.getCompletionPercent() != null && enrollment.getCompletionPercent() == 100
                && enrollment.getStatus() == Enrollment.EnrollmentStatus.ACTIVE) {
            enrollment.complete();
        }

        enrollment = enrollmentRepository.save(enrollment);

        // Auto-issue certificate when course reaches 100% completion
        if (enrollment.getCompletionPercent() != null && enrollment.getCompletionPercent() == 100
                && enrollment.getLearningClass() != null) {
            try {
                certificateUseCase.issueIfNotExists(
                        enrollment.getId(),
                        enrollment.getStudentId(),
                        enrollment.getLearningClass().getCourseId());
            } catch (IllegalArgumentException | IllegalStateException e) {
                log.warn("Failed to auto-issue certificate for enrollment {}: {}",
                        command.enrollmentId(), e.getMessage());
            }
        }

        log.info("Lesson progress updated for enrollment {}", command.enrollmentId());
        return EnrollmentResponse.from(enrollment);
    }

    private void recalculateCompletion(Enrollment enrollment) {
        if (enrollment.getProgress() == null || enrollment.getProgress().isEmpty()) {
            enrollment.updateCompletionPercent(0);
            return;
        }

        int totalLessons = 0;
        if (enrollment.getLearningClass() != null) {
            UUID courseId = enrollment.getLearningClass().getCourseId();
            if (courseId != null) {
                totalLessons = lessonCountPort.countLessonsInCourse(courseId);
            }
        }

        if (totalLessons == 0) {
            log.warn("Could not find total lessons for enrollment {}, setting progress to 0", enrollment.getId());
            enrollment.updateCompletionPercent(0);
            return;
        }

        long completedCount = enrollment.getProgress().values().stream()
            .filter(p -> "COMPLETED".equals(p.getStatus()))
            .count();

        int percent = (int) ((completedCount * 100) / totalLessons);
        enrollment.updateCompletionPercent(percent);
    }
}

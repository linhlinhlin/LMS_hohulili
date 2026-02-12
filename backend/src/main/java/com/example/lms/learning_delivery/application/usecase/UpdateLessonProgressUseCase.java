package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.learning_delivery.application.dto.EnrollmentResponse;
import com.example.lms.learning_delivery.application.dto.UpdateLessonProgressCommand;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.repository.CertificateRepository;
import com.example.lms.learning_delivery.domain.repository.EnrollmentRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Use case for updating lesson progress.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UpdateLessonProgressUseCase {

    private final EnrollmentRepository enrollmentRepository;
    private final CertificateUseCase certificateUseCase;

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

        enrollment = enrollmentRepository.save(enrollment);

        // Auto-issue certificate when course reaches 100% completion
        if (enrollment.getCompletionPercent() != null && enrollment.getCompletionPercent() == 100
                && enrollment.getLearningClass() != null) {
            try {
                certificateUseCase.issueIfNotExists(
                        enrollment.getId(),
                        enrollment.getStudentId(),
                        enrollment.getLearningClass().getCourseId());
            } catch (Exception e) {
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

        long completedCount = enrollment.getProgress().values().stream()
            .filter(p -> "COMPLETED".equals(p.getStatus()))
            .count();

        int totalLessons = enrollment.getProgress().size();
        int percent = totalLessons > 0 ? (int) ((completedCount * 100) / totalLessons) : 0;
        
        enrollment.updateCompletionPercent(percent);
    }
}

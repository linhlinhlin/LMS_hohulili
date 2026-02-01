package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.learning_delivery.application.dto.EnrollmentResponse;
import com.example.lms.learning_delivery.application.dto.UpdateLessonProgressCommand;
import com.example.lms.learning_delivery.domain.model.Enrollment;
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

        log.info("Lesson progress updated for enrollment {}", command.enrollmentId());
        return EnrollmentResponse.from(enrollment);
    }

    private void recalculateCompletion(Enrollment enrollment) {
        if (enrollment.getProgress() == null || enrollment.getProgress().isEmpty()) {
            enrollment.setCompletionPercent(0);
            return;
        }

        long completedCount = enrollment.getProgress().values().stream()
            .filter(p -> "COMPLETED".equals(p.getStatus()))
            .count();

        int totalLessons = enrollment.getProgress().size();
        int percent = totalLessons > 0 ? (int) ((completedCount * 100) / totalLessons) : 0;
        
        enrollment.setCompletionPercent(percent);

        // Mark as completed if 100%
        if (percent >= 100 && enrollment.getCompletedAt() == null) {
            enrollment.setCompletedAt(Instant.now());
            enrollment.setStatus(Enrollment.EnrollmentStatus.COMPLETED);
        }
    }
}

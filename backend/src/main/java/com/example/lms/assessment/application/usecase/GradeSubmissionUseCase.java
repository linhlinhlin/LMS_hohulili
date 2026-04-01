package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.domain.event.SubmissionGradedEvent;
import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentSubmissionJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentSubmissionJpaRepository;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.shared.domain.event.DomainEventPublisher;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Use case for grading assignment submissions.
 * Publishes SubmissionGradedEvent for STCW audit trail.
 */
@Service
@RequiredArgsConstructor
public class GradeSubmissionUseCase {

    private final AssignmentSubmissionJpaRepository submissionRepository;
    private final DomainEventPublisher eventPublisher;
    private final UserJpaRepository userJpaRepository;

    @Transactional
    public AssignmentSubmissionJpaEntity gradeSubmission(UUID submissionId, Double score, String feedback, UUID graderId) {
        var submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new EntityNotFoundException("Bai nop", submissionId));

        Double oldGrade = submission.getGrade();
        String oldFeedback = submission.getFeedback();

        applyGrade(submission, score, feedback, graderId);
        var saved = submissionRepository.save(submission);

        publishGradingEvent(saved, graderId, oldGrade, oldFeedback, score, feedback);
        return saved;
    }

    @Transactional
    public int batchGrade(UUID assignmentId, List<BatchGradeItem> items, UUID graderId) {
        if (items == null || items.isEmpty()) return 0;

        var submissionIds = items.stream().map(BatchGradeItem::submissionId).toList();
        var submissions = submissionRepository.findAllById(submissionIds);

        var submissionMap = new java.util.HashMap<UUID, AssignmentSubmissionJpaEntity>();
        submissions.forEach(s -> submissionMap.put(s.getId(), s));

        var toSave = new ArrayList<AssignmentSubmissionJpaEntity>();
        var events = new ArrayList<SubmissionGradedEvent>();
        int gradedCount = 0;

        for (var item : items) {
            var submission = submissionMap.get(item.submissionId());
            if (submission == null || !submission.getAssignmentId().equals(assignmentId)) {
                continue;
            }

            Double oldGrade = submission.getGrade();
            String oldFeedback = submission.getFeedback();

            applyGrade(submission, item.grade(), item.feedback(), graderId);
            toSave.add(submission);
            gradedCount++;

            events.add(buildEvent(submission, graderId, oldGrade, oldFeedback, item.grade(), item.feedback()));
        }

        if (!toSave.isEmpty()) {
            submissionRepository.saveAll(toSave);
            events.forEach(eventPublisher::publish);
        }
        return gradedCount;
    }

    private void applyGrade(AssignmentSubmissionJpaEntity submission, Double score, String feedback, UUID graderId) {
        if (score != null) {
            if (score < 0) throw new IllegalArgumentException("Diem phai >= 0");
            if (submission.getMaxGrade() != null && score > submission.getMaxGrade()) {
                throw new IllegalArgumentException("Diem vuot qua diem toi da: " + submission.getMaxGrade());
            }
            submission.setGrade(score);
        }
        if (feedback != null) {
            submission.setFeedback(feedback);
        }
        submission.setGradedBy(graderId);
        submission.setGradedAt(Instant.now());
        submission.setStatus(AssignmentSubmissionJpaEntity.SubmissionStatus.GRADED);
    }

    private void publishGradingEvent(AssignmentSubmissionJpaEntity submission, UUID graderId,
                                      Double oldGrade, String oldFeedback,
                                      Double newScore, String newFeedback) {
        eventPublisher.publish(buildEvent(submission, graderId, oldGrade, oldFeedback, newScore, newFeedback));
    }

    private SubmissionGradedEvent buildEvent(AssignmentSubmissionJpaEntity submission, UUID graderId,
                                              Double oldGrade, String oldFeedback,
                                              Double newScore, String newFeedback) {
        String graderName = userJpaRepository.findById(graderId)
                .map(u -> u.getFullName())
                .orElse("Unknown");

        String action;
        if (oldGrade == null && newScore != null) {
            action = "GRADE_CREATED";
        } else if (newScore != null && !newScore.equals(oldGrade)) {
            action = "GRADE_UPDATED";
        } else if (newFeedback != null && !newFeedback.equals(oldFeedback)) {
            action = "FEEDBACK_ADDED";
        } else {
            action = "GRADE_UPDATED";
        }

        return new SubmissionGradedEvent(
                submission.getId(), submission.getAssignmentId(), submission.getStudentId(),
                graderId, graderName, action,
                oldGrade, newScore, oldFeedback, newFeedback
        );
    }

    public record BatchGradeItem(UUID submissionId, Double grade, String feedback) {}
}

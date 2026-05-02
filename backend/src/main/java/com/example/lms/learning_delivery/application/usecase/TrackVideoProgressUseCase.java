package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.learning_delivery.domain.model.LearningEvent;
import com.example.lms.learning_delivery.domain.model.VideoProgress;
import com.example.lms.learning_delivery.domain.repository.LearningEventRepository;
import com.example.lms.learning_delivery.domain.repository.VideoProgressRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TrackVideoProgressUseCase {

    private final VideoProgressRepository videoProgressRepository;
    private final LearningEventRepository learningEventRepository;
    private final PlatformTransactionManager transactionManager;

    public VideoProgressDTO trackSegments(UUID studentId, UUID lessonId, String sectionId,
                                           int durationSeconds, int fromSecond, int toSecond,
                                           double lastPosition, Double completionThreshold) {
        // FE WatchedSegmentsTracker fires multiple parallel POSTs (one per
        // contiguous range) for the same (student, section). The previous
        // findByStudentAndSection→save flow was a Read-Modify-Write race:
        // both requests see no row, both call create()+save(), the second
        // INSERT trips the unique constraint (student_id, section_id) → 500.
        //
        // Retry on DataIntegrityViolationException with a fresh tx — the
        // failed tx is poisoned (cannot reuse), and on retry the row exists
        // so we take the UPDATE branch. TransactionTemplate (vs a self-call
        // through @Transactional) avoids Spring's self-invocation gotcha
        // where AOP doesn't apply to method calls within the same bean.
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

        try {
            return tx.execute(status -> doTrackSegments(studentId, lessonId, sectionId,
                    durationSeconds, fromSecond, toSecond, lastPosition, completionThreshold));
        } catch (DataIntegrityViolationException duplicate) {
            return tx.execute(status -> doTrackSegments(studentId, lessonId, sectionId,
                    durationSeconds, fromSecond, toSecond, lastPosition, completionThreshold));
        }
    }

    private VideoProgressDTO doTrackSegments(UUID studentId, UUID lessonId, String sectionId,
                                              int durationSeconds, int fromSecond, int toSecond,
                                              double lastPosition, Double completionThreshold) {
        VideoProgress vp = videoProgressRepository.findByStudentAndSection(studentId, sectionId)
                .orElseGet(() -> VideoProgress.create(studentId, lessonId, sectionId, durationSeconds));

        if (completionThreshold != null && completionThreshold > 0) {
            vp.setCompletionThreshold(completionThreshold);
        }
        vp.updateDuration(durationSeconds);
        vp.markWatched(fromSecond, toSecond);
        vp.updateLastPosition(lastPosition);

        VideoProgress saved = videoProgressRepository.save(vp);

        if (saved.isCompleted()) {
            learningEventRepository.save(LearningEvent.create(
                    studentId, lessonId, sectionId,
                    LearningEvent.EventType.COMPLETE,
                    Map.of("progressPercent", saved.getProgressPercent(),
                           "watchedSeconds", saved.getWatchedSeconds())
            ));
        }

        return toDTO(saved);
    }

    @Transactional(readOnly = true)
    public VideoProgressDTO getProgress(UUID studentId, String sectionId) {
        return videoProgressRepository.findByStudentAndSection(studentId, sectionId)
                .map(this::toDTO)
                .orElse(emptyDTO(sectionId));
    }

    @Transactional(readOnly = true)
    public List<VideoProgressDTO> getLessonProgress(UUID studentId, UUID lessonId) {
        return videoProgressRepository.findByStudentAndLesson(studentId, lessonId)
                .stream().map(this::toDTO).toList();
    }

    @Transactional(readOnly = true)
    public boolean canProceed(UUID studentId, String sectionId) {
        return videoProgressRepository.findByStudentAndSection(studentId, sectionId)
                .map(VideoProgress::isCompleted)
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public double getResumePosition(UUID studentId, String sectionId) {
        return videoProgressRepository.findByStudentAndSection(studentId, sectionId)
                .map(VideoProgress::getLastPosition)
                .orElse(0.0);
    }

    private VideoProgressDTO toDTO(VideoProgress vp) {
        return new VideoProgressDTO(
                vp.getId(),
                vp.getStudentId(),
                vp.getLessonId(),
                vp.getSectionId(),
                vp.getDurationSeconds(),
                vp.getWatchedSeconds(),
                vp.getProgressPercent(),
                vp.isCompleted(),
                vp.getLastPosition()
        );
    }

    private VideoProgressDTO emptyDTO(String sectionId) {
        return new VideoProgressDTO(null, null, null, sectionId, 0, 0, 0.0, false, 0.0);
    }

    public record VideoProgressDTO(
            UUID id,
            UUID studentId,
            UUID lessonId,
            String sectionId,
            int durationSeconds,
            int watchedSeconds,
            double progressPercent,
            boolean completed,
            double lastPosition
    ) {}

    public record TrackSegmentsRequest(
            UUID lessonId,
            String sectionId,
            @jakarta.validation.constraints.Positive(message = "Thời lượng phải lớn hơn 0")
            int durationSeconds,
            @jakarta.validation.constraints.PositiveOrZero(message = "Vị trí bắt đầu không được âm")
            int fromSecond,
            @jakarta.validation.constraints.PositiveOrZero(message = "Vị trí kết thúc không được âm")
            int toSecond,
            double lastPosition,
            Double completionThreshold
    ) {}

    public record CanProceedResponse(boolean canProceed) {}
    public record ResumePositionResponse(double position) {}
}

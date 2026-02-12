package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.learning_delivery.domain.model.LearningEvent;
import com.example.lms.learning_delivery.domain.model.VideoProgress;
import com.example.lms.learning_delivery.domain.repository.LearningEventRepository;
import com.example.lms.learning_delivery.domain.repository.VideoProgressRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TrackVideoProgressUseCase {

    private final VideoProgressRepository videoProgressRepository;
    private final LearningEventRepository learningEventRepository;

    @Transactional
    public VideoProgressDTO trackSegments(UUID studentId, UUID lessonId, String sectionId,
                                           int durationSeconds, int fromSecond, int toSecond,
                                           double lastPosition) {
        VideoProgress vp = videoProgressRepository.findByStudentAndSection(studentId, sectionId)
                .orElseGet(() -> VideoProgress.create(studentId, lessonId, sectionId, durationSeconds));

        vp.updateDuration(durationSeconds);
        vp.markWatched(fromSecond, toSecond);
        vp.updateLastPosition(lastPosition);

        VideoProgress saved = videoProgressRepository.save(vp);

        // Log completion event
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
                .map(vp -> vp.isCompleted() || vp.getProgressPercent() >= 90.0)
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
            int durationSeconds,
            int fromSecond,
            int toSecond,
            double lastPosition
    ) {}

    public record CanProceedResponse(boolean canProceed) {}
    public record ResumePositionResponse(double position) {}
}

package com.example.lms.service;

import com.example.lms.entity.VideoProgress;
import com.example.lms.repository.VideoProgressRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Service for managing video viewing progress
 * Implements 75% completion rule for lesson progression
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class VideoProgressService {

    private final VideoProgressRepository videoProgressRepository;

    /**
     * Track video progress for a user
     * Auto-updates completion status when reaching 75%
     */
    public VideoProgress trackProgress(UUID userId, UUID sectionId, String videoUrl, 
                                       Integer currentPosition, Integer duration) {
        log.debug("Tracking progress for user={}, section={}, time={}/{}", 
                  userId, sectionId, currentPosition, duration);

        VideoProgress progress = videoProgressRepository
                .findByUserIdAndSectionId(userId, sectionId)
                .orElseGet(() -> VideoProgress.builder()
                        .userId(userId)
                        .sectionId(sectionId)
                        .videoUrl(videoUrl)
                        .build());

        // Update progress (includes 75% check)
        progress.updateProgress(currentPosition, duration);

        VideoProgress saved = videoProgressRepository.save(progress);

        if (saved.isCompleted()) {
            log.info("Video completed (≥75%) - user={}, section={}, progress={}%", 
                     userId, sectionId, saved.getProgressAsDouble());
        }

        return saved;
    }

    /**
     * Get progress for a specific video
     */
    @Transactional(readOnly = true)
    public Optional<VideoProgress> getProgress(UUID userId, UUID sectionId) {
        return videoProgressRepository.findByUserIdAndSectionId(userId, sectionId);
    }

    /**
     * Get all progress for a user
     */
    @Transactional(readOnly = true)
    public List<VideoProgress> getUserProgress(UUID userId) {
        return videoProgressRepository.findByUserId(userId);
    }

    /**
     * Check if user can proceed to next lesson (75% completion rule)
     */
    @Transactional(readOnly = true)
    public boolean canProceedToNextLesson(UUID userId, UUID currentSectionId) {
        return videoProgressRepository.isVideoCompleted(userId, currentSectionId);
    }

    /**
     * Get completion percentage for a video
     */
    @Transactional(readOnly = true)
    public double getCompletionPercentage(UUID userId, UUID sectionId) {
        return videoProgressRepository.getProgressPercentage(userId, sectionId)
                .orElse(0.0);
    }

    /**
     * Check if video is completed (≥75%)
     */
    @Transactional(readOnly = true)
    public boolean isVideoCompleted(UUID userId, UUID sectionId) {
        return videoProgressRepository.isVideoCompleted(userId, sectionId);
    }

    /**
     * Reset progress for a video
     */
    public void resetProgress(UUID userId, UUID sectionId) {
        log.info("Resetting progress for user={}, section={}", userId, sectionId);
        videoProgressRepository.findByUserIdAndSectionId(userId, sectionId)
                .ifPresent(videoProgressRepository::delete);
    }
}

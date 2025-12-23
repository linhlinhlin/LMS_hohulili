package com.example.lms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity for tracking video viewing progress
 * Supports 75% completion rule for lesson progression
 */
@Entity
@Table(name = "video_progress", uniqueConstraints = {
    @UniqueConstraint(name = "uk_user_section", columnNames = {"user_id", "section_id"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VideoProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "section_id", nullable = false)
    private UUID sectionId;

    @Column(name = "video_url", nullable = false, columnDefinition = "TEXT")
    private String videoUrl;

    /**
     * Current playback position in seconds
     */
    @Column(name = "current_position", nullable = false)
    @Builder.Default
    private Integer currentPosition = 0;

    /**
     * Total video duration in seconds
     */
    @Column(name = "duration", nullable = false)
    @Builder.Default
    private Integer duration = 0;

    /**
     * Progress percentage (0.00 - 100.00)
     * Calculated as (currentPosition / duration) * 100
     */
    @Column(name = "progress_percentage", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal progressPercentage = BigDecimal.ZERO;

    /**
     * Completion status (true if progress >= 75%)
     */
    @Column(name = "completed", nullable = false)
    @Builder.Default
    private Boolean completed = false;

    @Column(name = "first_watched_at")
    private LocalDateTime firstWatchedAt;

    @Column(name = "last_watched_at")
    private LocalDateTime lastWatchedAt;

    @Column(name = "completion_date")
    private LocalDateTime completionDate;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /**
     * Update progress and check for completion (75% threshold)
     */
    public void updateProgress(Integer currentPosition, Integer duration) {
        this.currentPosition = currentPosition;
        this.duration = duration;
        
        // Calculate progress percentage
        if (duration > 0) {
            double progress = ((double) currentPosition / duration) * 100.0;
            this.progressPercentage = BigDecimal.valueOf(progress).setScale(2, BigDecimal.ROUND_HALF_UP);
            
            // Check 75% completion threshold
            if (!this.completed && progress >= 75.0) {
                this.completed = true;
                this.completionDate = LocalDateTime.now();
            }
        }
        
        this.lastWatchedAt = LocalDateTime.now();
        
        if (this.firstWatchedAt == null) {
            this.firstWatchedAt = LocalDateTime.now();
        }
    }

    /**
     * Check if video can be considered completed (≥75%)
     */
    public boolean isCompleted() {
        return completed != null && completed;
    }

    /**
     * Get progress as percentage (0-100)
     */
    public double getProgressAsDouble() {
        return progressPercentage != null ? progressPercentage.doubleValue() : 0.0;
    }
}

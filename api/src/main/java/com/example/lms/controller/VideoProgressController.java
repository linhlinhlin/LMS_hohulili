package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.entity.User;
import com.example.lms.entity.VideoProgress;
import com.example.lms.service.VideoProgressService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/video-progress")
@RequiredArgsConstructor
@Tag(name = "Video Progress", description = "API for tracking video viewing progress")
@SecurityRequirement(name = "Bearer Authentication")
public class VideoProgressController {

    private final VideoProgressService videoProgressService;

    @PostMapping("/track")
    @Operation(summary = "Track video progress", description = "Update video viewing progress and check 75% completion")
    public ResponseEntity<ApiResponse<VideoProgressResponse>> trackProgress(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody TrackProgressRequest request) {
        
        VideoProgress progress = videoProgressService.trackProgress(
                currentUser.getId(),
                request.getSectionId(),
                request.getVideoUrl(),
                request.getCurrentPosition(),
                request.getDuration()
        );

        return ResponseEntity.ok(ApiResponse.success(VideoProgressResponse.from(progress)));
    }

    @GetMapping("/{sectionId}")
    @Operation(summary = "Get video progress", description = "Get current progress for a specific video")
    public ResponseEntity<ApiResponse<VideoProgressResponse>> getProgress(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID sectionId) {
        
        return videoProgressService.getProgress(currentUser.getId(), sectionId)
                .map(progress -> ResponseEntity.ok(ApiResponse.success(VideoProgressResponse.from(progress))))
                .orElse(ResponseEntity.ok(ApiResponse.success(null)));
    }

    @GetMapping("/my-progress")
    @Operation(summary = "Get all my progress", description = "Get all video progress for current user")
    public ResponseEntity<ApiResponse<List<VideoProgressResponse>>> getMyProgress(
            @AuthenticationPrincipal User currentUser) {
        
        List<VideoProgressResponse> progressList = videoProgressService.getUserProgress(currentUser.getId())
                .stream()
                .map(VideoProgressResponse::from)
                .toList();

        return ResponseEntity.ok(ApiResponse.success(progressList));
    }

    @GetMapping("/{sectionId}/can-proceed")
    @Operation(summary = "Check if can proceed", description = "Check if user has completed ≥75% and can proceed to next lesson")
    public ResponseEntity<ApiResponse<CanProceedResponse>> canProceed(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID sectionId) {
        
        boolean canProceed = videoProgressService.canProceedToNextLesson(currentUser.getId(), sectionId);
        double percentage = videoProgressService.getCompletionPercentage(currentUser.getId(), sectionId);

        CanProceedResponse response = new CanProceedResponse(
                canProceed,
                percentage,
                percentage >= 75.0 ? "You can proceed to the next lesson" : 
                                    String.format("Watch %.0f%% more to unlock next lesson", 75.0 - percentage)
        );

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/{sectionId}")
    @Operation(summary = "Reset progress", description = "Reset video progress for a section")
    public ResponseEntity<ApiResponse<String>> resetProgress(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID sectionId) {
        
        videoProgressService.resetProgress(currentUser.getId(), sectionId);
        return ResponseEntity.ok(ApiResponse.success("Progress reset successfully"));
    }

    // DTOs
    @Data
    public static class TrackProgressRequest {
        @NotNull(message = "Section ID is required")
        private UUID sectionId;

        @NotNull(message = "Video URL is required")
        private String videoUrl;

        @NotNull(message = "Current position is required")
        private Integer currentPosition;  // seconds

        @NotNull(message = "Duration is required")
        private Integer duration;     // seconds
    }

    @Data
    public static class VideoProgressResponse {
        private UUID id;
        private UUID userId;
        private UUID sectionId;
        private String videoUrl;
        private Integer currentPosition;
        private Integer duration;
        private Double progressPercentage;
        private Boolean completed;
        private String lastWatchedAt;
        private String completionDate;

        public static VideoProgressResponse from(VideoProgress progress) {
            VideoProgressResponse response = new VideoProgressResponse();
            response.setId(progress.getId());
            response.setUserId(progress.getUserId());
            response.setSectionId(progress.getSectionId());
            response.setVideoUrl(progress.getVideoUrl());
            response.setCurrentPosition(progress.getCurrentPosition());
            response.setDuration(progress.getDuration());
            response.setProgressPercentage(progress.getProgressAsDouble());
            response.setCompleted(progress.isCompleted());
            response.setLastWatchedAt(progress.getLastWatchedAt() != null ? 
                    progress.getLastWatchedAt().toString() : null);
            response.setCompletionDate(progress.getCompletionDate() != null ? 
                    progress.getCompletionDate().toString() : null);
            return response;
        }
    }

    @Data
    public static class CanProceedResponse {
        private Boolean canProceed;
        private Double currentProgress;
        private String message;

        public CanProceedResponse(Boolean canProceed, Double currentProgress, String message) {
            this.canProceed = canProceed;
            this.currentProgress = currentProgress;
            this.message = message;
        }
    }
}

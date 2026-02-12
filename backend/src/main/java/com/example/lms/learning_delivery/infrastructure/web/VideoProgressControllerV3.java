package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.learning_delivery.application.usecase.TrackVideoProgressUseCase;
import com.example.lms.learning_delivery.application.usecase.TrackVideoProgressUseCase.*;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v3/video-progress")
@RequiredArgsConstructor
@Tag(name = "Video Progress", description = "Video progress tracking with bitmap-based watched segments")
public class VideoProgressControllerV3 {

    private final TrackVideoProgressUseCase useCase;

    @Operation(summary = "Track watched video segments (heartbeat)")
    @PostMapping("/track")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<VideoProgressDTO>> trackSegments(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @Valid @RequestBody TrackSegmentsRequest request) {
        UUID studentId = currentUser.getId();
        var result = useCase.trackSegments(
                studentId,
                request.lessonId(),
                request.sectionId(),
                request.durationSeconds(),
                request.fromSecond(),
                request.toSecond(),
                request.lastPosition()
        );
        return ResponseEntity.ok(ApiResponse.success(result, "Đã ghi nhận tiến độ"));
    }

    @Operation(summary = "Get video progress for a section")
    @GetMapping("/{sectionId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<VideoProgressDTO>> getProgress(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @PathVariable String sectionId) {
        UUID studentId = currentUser.getId();
        var result = useCase.getProgress(studentId, sectionId);
        return ResponseEntity.ok(ApiResponse.success(result, "Tiến độ xem video"));
    }

    @Operation(summary = "Get all video progress for a lesson")
    @GetMapping("/lesson/{lessonId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<VideoProgressDTO>>> getLessonProgress(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @PathVariable UUID lessonId) {
        UUID studentId = currentUser.getId();
        var result = useCase.getLessonProgress(studentId, lessonId);
        return ResponseEntity.ok(ApiResponse.success(result, "Tiến độ bài học"));
    }

    @Operation(summary = "Check if student can proceed past a video section")
    @GetMapping("/{sectionId}/can-proceed")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<CanProceedResponse>> canProceed(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @PathVariable String sectionId) {
        UUID studentId = currentUser.getId();
        boolean canProceed = useCase.canProceed(studentId, sectionId);
        return ResponseEntity.ok(ApiResponse.success(new CanProceedResponse(canProceed), "Kết quả kiểm tra"));
    }

    @Operation(summary = "Get resume position for a video section")
    @GetMapping("/{sectionId}/resume")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ResumePositionResponse>> getResumePosition(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @PathVariable String sectionId) {
        UUID studentId = currentUser.getId();
        double position = useCase.getResumePosition(studentId, sectionId);
        return ResponseEntity.ok(ApiResponse.success(new ResumePositionResponse(position), "Vị trí tiếp tục xem"));
    }

}

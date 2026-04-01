package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.VideoAssetJpaEntity;
import com.example.lms.learning_delivery.infrastructure.service.AdaptiveVideoPlaybackService;
import com.example.lms.learning_delivery.infrastructure.service.VideoAssetLifecycleService;
import com.example.lms.learning_delivery.infrastructure.service.VideoAssetPresentationService;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v3/video-assets")
@RequiredArgsConstructor
@Tag(name = "Video Assets V3", description = "Video asset pipeline for learner-facing lesson videos")
public class VideoAssetControllerV3 {

    private final VideoAssetLifecycleService videoAssetLifecycleService;
    private final VideoAssetPresentationService videoAssetPresentationService;
    private final AdaptiveVideoPlaybackService adaptiveVideoPlaybackService;

    @PostMapping("/from-upload")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN','ORG_ADMIN')")
    @Operation(summary = "Create a video asset from a confirmed upload attachment")
    public ResponseEntity<ApiResponse<VideoAssetResponse>> createFromUpload(
            @RequestBody CreateVideoAssetFromUploadRequest request,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        VideoAssetJpaEntity asset = videoAssetLifecycleService.createFromUpload(
                request.attachmentId(),
                user,
                request.displayName()
        );
        return ResponseEntity.ok(ApiResponse.success(toResponse(asset, user), "Da tao video asset va dua vao hang doi xu ly"));
    }

    @GetMapping("/{assetId}")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN','ORG_ADMIN')")
    @Operation(summary = "Get video asset status and available playback/offline profiles")
    public ResponseEntity<ApiResponse<VideoAssetResponse>> getById(
            @PathVariable UUID assetId,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        VideoAssetJpaEntity asset = videoAssetLifecycleService.requireAccessibleAsset(assetId, user);
        return ResponseEntity.ok(ApiResponse.success(toResponse(asset, user), "Trang thai video asset"));
    }

    @GetMapping("/{assetId}/play")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get adaptive playback URL for a video asset (accessible to all authenticated users)")
    public ResponseEntity<ApiResponse<PlaybackResponse>> getPlayUrl(
            @PathVariable UUID assetId,
            @RequestParam(defaultValue = "hls") String format,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        return adaptiveVideoPlaybackService.createPlaybackSession(assetId, user.getId(), format)
                .map(session -> ResponseEntity.ok(ApiResponse.success(
                        new PlaybackResponse(session.playUrl(), session.videoAssetId(), session.videoSourceKind(), session.format()),
                        "Playback URL"
                )))
                .orElse(ResponseEntity.ok(ApiResponse.success(null, "Video chua san sang de phat")));
    }

    @PostMapping("/{assetId}/retry")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN','ORG_ADMIN')")
    @Operation(summary = "Retry processing a failed or pending video asset")
    public ResponseEntity<ApiResponse<VideoAssetResponse>> retry(
            @PathVariable UUID assetId,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        VideoAssetJpaEntity asset = videoAssetLifecycleService.retry(assetId, user);
        return ResponseEntity.ok(ApiResponse.success(toResponse(asset, user), "Da dua video asset vao hang doi xu ly lai"));
    }

    private VideoAssetResponse toResponse(VideoAssetJpaEntity asset, UserJpaEntity user) {
        VideoAssetPresentationService.VideoAssetView view = videoAssetPresentationService.getView(asset.getId())
                .orElse(new VideoAssetPresentationService.VideoAssetView(
                        asset.getId(),
                        asset.getStatus(),
                        asset.getAdaptivePackagingStatus(),
                        "LEGACY_DIRECT",
                        asset.getOriginalFileName(),
                        asset.getSourceFileSize(),
                        asset.getDurationSeconds(),
                        asset.getWidth(),
                        asset.getHeight(),
                        asset.getStreamVideoUid(),
                        null,
                        asset.getErrorMessage(),
                        asset.getHlsManifestStorageKey(),
                        asset.getDashManifestStorageKey(),
                        List.of()
                ));

        String previewPlaybackUrl = user == null
                ? null
                : adaptiveVideoPlaybackService.createPlaybackSession(view.id(), user.getId(), "hls")
                .map(AdaptiveVideoPlaybackService.PlaybackSession::playUrl)
                .orElse(null);

        List<VideoAssetProfileResponse> profiles = view.availableOfflineProfiles().stream()
                .map(profile -> new VideoAssetProfileResponse(
                        profile.id(),
                        profile.label(),
                        profile.actualResolution(),
                        profile.sizeBytes()
                ))
                .toList();

        return new VideoAssetResponse(
                view.id(),
                view.status(),
                view.adaptivePackagingStatus(),
                view.videoSourceKind(),
                view.originalFileName(),
                view.sourceFileSize(),
                view.durationSeconds(),
                view.width(),
                view.height(),
                view.streamVideoUid(),
                previewPlaybackUrl,
                view.errorMessage(),
                view.hlsManifestStorageKey(),
                view.dashManifestStorageKey(),
                profiles
        );
    }

    public record PlaybackResponse(
            String playUrl,
            UUID videoAssetId,
            String videoSourceKind,
            String format
    ) {}

    public record CreateVideoAssetFromUploadRequest(UUID attachmentId, String displayName) {}

    public record VideoAssetProfileResponse(
            String id,
            String label,
            String actualResolution,
            Long sizeBytes
    ) {}

    public record VideoAssetResponse(
            UUID id,
            String status,
            String adaptivePackagingStatus,
            String videoSourceKind,
            String originalFileName,
            Long sourceFileSize,
            Integer durationSeconds,
            Integer width,
            Integer height,
            String streamVideoUid,
            String playbackUrl,
            String errorMessage,
            String hlsManifestStorageKey,
            String dashManifestStorageKey,
            List<VideoAssetProfileResponse> availableOfflineProfiles
    ) {}
}

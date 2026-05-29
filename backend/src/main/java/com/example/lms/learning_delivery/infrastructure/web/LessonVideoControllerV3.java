package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.LessonJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.learning_delivery.infrastructure.service.AdaptiveVideoPlaybackService;
import com.example.lms.learning_delivery.infrastructure.service.VideoAssetPresentationService;
import com.example.lms.learning_delivery.infrastructure.service.VideoBinaryStorageService;
import com.example.lms.shared.domain.model.ContentBlock;
import com.example.lms.shared.infrastructure.persistence.entity.PaymentTransactionJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.PaymentTransactionJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v3/lessons")
@RequiredArgsConstructor
public class LessonVideoControllerV3 {

    private static final Duration OFFLINE_DOWNLOAD_TTL = Duration.ofMinutes(15);

    private final AdaptiveVideoPlaybackService adaptiveVideoPlaybackService;
    private final VideoAssetPresentationService videoAssetPresentationService;
    private final VideoBinaryStorageService videoBinaryStorageService;
    private final LessonJpaRepository lessonRepo;
    private final CourseRepository courseRepository;
    private final PaymentTransactionJpaRepository paymentRepository;

    @PostMapping("/{lessonId}/video")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN','ORG_ADMIN')")
    public ResponseEntity<Map<String, Object>> uploadVideo(
            @PathVariable UUID lessonId,
            @RequestParam("file") MultipartFile file
    ) {
        return ResponseEntity.status(HttpStatus.GONE).body(Map.of(
                "error", "Direct lesson video upload has been retired. Use the presigned upload + video asset flow."
        ));
    }

    @GetMapping("/{lessonId}/video/play")
    @PreAuthorize("hasAnyRole('STUDENT','TEACHER','ADMIN','ORG_ADMIN')")
    public ResponseEntity<Map<String, Object>> getPlayUrl(
            @PathVariable UUID lessonId,
            @RequestParam(required = false, defaultValue = "hls") String format,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        LessonJpaEntity lesson = lessonRepo.findById(lessonId).orElse(null);
        if (lesson == null) {
            return ResponseEntity.notFound().build();
        }

        verifyLearnerAccess(lesson, user);

        UUID videoAssetId = resolveSingleVideoAssetId(lesson);
        if (videoAssetId == null || user == null) {
            return ResponseEntity.noContent().build();
        }

        return adaptiveVideoPlaybackService.createPlaybackSession(videoAssetId, user.getId(), format)
                .map(session -> ResponseEntity.ok(Map.<String, Object>of(
                        "playUrl", session.playUrl(),
                        "videoAssetId", session.videoAssetId().toString(),
                        "videoSourceKind", session.videoSourceKind(),
                        "format", session.format(),
                        "cdnDeliveryMode", session.cdnDeliveryMode(),
                        "mediaDomainSegmentDeliveryEnabled", session.mediaDomainSegmentDeliveryEnabled(),
                        "lessonId", lessonId.toString()
                )))
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/{lessonId}/video/download")
    @PreAuthorize("hasAnyRole('STUDENT','TEACHER','ADMIN','ORG_ADMIN')")
    public ResponseEntity<Map<String, Object>> getDownloadUrl(
            @PathVariable UUID lessonId,
            @RequestParam(required = false) String profile,
            @RequestParam(required = false) String quality,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        LessonJpaEntity lesson = lessonRepo.findById(lessonId).orElse(null);
        if (lesson == null) {
            return ResponseEntity.notFound().build();
        }

        verifyLearnerAccess(lesson, user);

        UUID videoAssetId = resolveSingleVideoAssetId(lesson);
        if (videoAssetId == null) {
            return ResponseEntity.noContent().build();
        }

        String requestedProfile = normalizeRequestedProfile(profile, quality);
        return videoAssetPresentationService.resolveOfflineTarget(videoAssetId, requestedProfile)
                .map(target -> ResponseEntity.ok(buildDownloadResponse(
                        videoBinaryStorageService.createReadUrl(target.storageKey(), OFFLINE_DOWNLOAD_TTL),
                        target.profile(),
                        target.profileLabel(),
                        target.actualResolution(),
                        target.sizeBytes(),
                        Map.of("videoAssetId", videoAssetId.toString(), "lessonId", lessonId.toString())
                )))
                .orElseGet(() -> ResponseEntity.badRequest().body(
                        Map.of("error", "No offline profile is available for this lesson video")
                ));
    }

    @GetMapping("/{lessonId}/video/sizes")
    @PreAuthorize("hasAnyRole('STUDENT','TEACHER','ADMIN','ORG_ADMIN')")
    public ResponseEntity<Map<String, Object>> getQualitySizes(
            @PathVariable UUID lessonId,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        LessonJpaEntity lesson = lessonRepo.findById(lessonId).orElse(null);
        if (lesson == null) {
            return ResponseEntity.notFound().build();
        }

        verifyLearnerAccess(lesson, user);

        UUID videoAssetId = resolveSingleVideoAssetId(lesson);
        if (videoAssetId == null) {
            return ResponseEntity.ok(Map.of(
                    "sizes", Map.of(),
                    "profiles", List.of(),
                    "videoSourceKind", "LEGACY_DIRECT",
                    "lessonId", lessonId.toString()
            ));
        }

        VideoAssetPresentationService.VideoAssetView assetView = videoAssetPresentationService.getView(videoAssetId).orElse(null);
        if (assetView == null) {
            return ResponseEntity.ok(Map.of(
                    "sizes", Map.of(),
                    "profiles", List.of(),
                    "videoSourceKind", "ADAPTIVE_R2",
                    "videoAssetId", videoAssetId.toString(),
                    "lessonId", lessonId.toString()
            ));
        }

        Map<String, Long> sizes = new LinkedHashMap<>();
        for (VideoAssetPresentationService.OfflineProfileView profileView : assetView.availableOfflineProfiles()) {
            if (profileView.actualResolution() != null && profileView.sizeBytes() != null) {
                sizes.put(profileView.actualResolution(), profileView.sizeBytes());
            }
        }

        return ResponseEntity.ok(Map.of(
                "sizes", sizes,
                "profiles", assetView.availableOfflineProfiles().stream()
                        .map(profileView -> Map.of(
                                "id", profileView.id(),
                                "label", profileView.label(),
                                "actualResolution", profileView.actualResolution(),
                                "sizeBytes", profileView.sizeBytes()
                        ))
                        .toList(),
                "videoSourceKind", assetView.videoSourceKind(),
                "videoAssetId", videoAssetId.toString(),
                "lessonId", lessonId.toString()
        ));
    }

    @DeleteMapping("/{lessonId}/video")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN','ORG_ADMIN')")
    public ResponseEntity<Void> deleteVideo(@PathVariable UUID lessonId) {
        LessonJpaEntity lesson = lessonRepo.findById(lessonId).orElse(null);
        if (lesson == null) {
            return ResponseEntity.notFound().build();
        }

        lesson.setStreamVideoUid(null);
        lesson.setVideoUrl(null);
        lessonRepo.save(lesson);
        return ResponseEntity.noContent().build();
    }

    private UUID resolveSingleVideoAssetId(LessonJpaEntity lesson) {
        if (lesson.getContentBlocks() == null || lesson.getContentBlocks().isEmpty()) {
            return null;
        }

        UUID assetId = null;
        for (ContentBlock block : lesson.getContentBlocks()) {
            if (!"VIDEO".equalsIgnoreCase(block.getType()) || block.getData() == null) {
                continue;
            }

            Object rawValue = block.getData().get("videoAssetId");
            if (rawValue == null) {
                continue;
            }

            UUID parsed = parseUuid(rawValue.toString());
            if (parsed == null) {
                continue;
            }

            if (assetId != null && !assetId.equals(parsed)) {
                return null;
            }
            assetId = parsed;
        }
        return assetId;
    }

    private UUID parseUuid(String value) {
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private void verifyLearnerAccess(LessonJpaEntity lesson, UserJpaEntity user) {
        if (user == null) {
            throw new AccessDeniedException("Authentication is required");
        }

        if (isAdminRole(user) || user.getRole() == UserJpaEntity.UserRole.TEACHER) {
            return;
        }

        Course course = courseRepository.findByLessonId(lesson.getId())
                .orElseThrow(() -> new AccessDeniedException("Lesson is not attached to a course"));

        boolean courseFree = (course.getPrice() == null || course.getPrice().compareTo(BigDecimal.ZERO) <= 0)
                || (course.getSalePrice() != null && course.getSalePrice().compareTo(BigDecimal.ZERO) <= 0);
        if (courseFree || Boolean.TRUE.equals(lesson.getIsFree())) {
            return;
        }

        boolean hasPaid = paymentRepository.existsByStudentIdAndCourseIdAndStatus(
                user.getId(),
                course.getId(),
                PaymentTransactionJpaEntity.PaymentStatus.COMPLETED
        );
        if (!hasPaid) {
            throw new AccessDeniedException("Course content is locked until payment is completed");
        }
    }

    private boolean isAdminRole(UserJpaEntity user) {
        return user.getRole() == UserJpaEntity.UserRole.ADMIN
                || user.getRole() == UserJpaEntity.UserRole.ORG_ADMIN;
    }

    private String normalizeRequestedProfile(String profile, String quality) {
        String requestedProfile = profile;
        if ((requestedProfile == null || requestedProfile.isBlank()) && quality != null && !quality.isBlank()) {
            requestedProfile = switch (quality.trim().toUpperCase(Locale.ROOT)) {
                case "144P", "360P", "SAVER" -> "SAVER";
                case "1080P", "HIGH" -> "HIGH";
                default -> "STANDARD";
            };
        }
        if (requestedProfile == null || requestedProfile.isBlank()) {
            return "STANDARD";
        }
        return requestedProfile;
    }

    private Map<String, Object> buildDownloadResponse(
            String downloadUrl,
            String profile,
            String profileLabel,
            String actualResolution,
            Long fileSizeBytes,
            Map<String, Object> extras
    ) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("downloadUrl", downloadUrl);
        body.put("profile", profile);
        body.put("profileLabel", profileLabel);
        body.put("actualResolution", actualResolution);
        body.put("fileSizeBytes", fileSizeBytes);
        body.putAll(extras);
        return body;
    }
}

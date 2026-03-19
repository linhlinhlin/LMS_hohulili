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
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/v3/sections")
@RequiredArgsConstructor
@Slf4j
public class SectionVideoControllerV3 {

    private static final Duration OFFLINE_DOWNLOAD_TTL = Duration.ofMinutes(15);

    private final AdaptiveVideoPlaybackService adaptiveVideoPlaybackService;
    private final VideoAssetPresentationService videoAssetPresentationService;
    private final VideoBinaryStorageService videoBinaryStorageService;
    private final LessonJpaRepository lessonRepository;
    private final CourseRepository courseRepository;
    private final PaymentTransactionJpaRepository paymentRepository;

    @PostMapping("/{sectionId}/video")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN','ORG_ADMIN')")
    public ResponseEntity<Map<String, Object>> uploadVideo(
            @PathVariable String sectionId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        return ResponseEntity.status(HttpStatus.GONE).body(Map.of(
                "error", "Direct section video upload has been retired. Use /api/v3/files/upload/init and /api/v3/video-assets/from-upload."
        ));
    }

    @GetMapping("/{sectionId}/video/play")
    @PreAuthorize("hasAnyRole('STUDENT','TEACHER','ADMIN','ORG_ADMIN')")
    public ResponseEntity<Map<String, Object>> getPlayUrl(
            @PathVariable String sectionId,
            @RequestParam(required = false, defaultValue = "hls") String format,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        SectionVideoContext context = findSectionContext(sectionId).orElse(null);
        if (context == null) {
            return ResponseEntity.notFound().build();
        }

        verifyLearnerAccess(context.lesson(), user);

        UUID videoAssetId = resolveVideoAssetId(context.blockData());
        if (videoAssetId == null || user == null) {
            return ResponseEntity.noContent().build();
        }

        return adaptiveVideoPlaybackService.createPlaybackSession(videoAssetId, user.getId(), format)
                .map(session -> ResponseEntity.ok(Map.<String, Object>of(
                        "playUrl", session.playUrl(),
                        "videoAssetId", session.videoAssetId().toString(),
                        "videoSourceKind", session.videoSourceKind(),
                        "format", session.format(),
                        "sectionId", sectionId
                )))
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/{sectionId}/video/download")
    @PreAuthorize("hasAnyRole('STUDENT','TEACHER','ADMIN','ORG_ADMIN')")
    public ResponseEntity<Map<String, Object>> getDownloadUrl(
            @PathVariable String sectionId,
            @RequestParam(required = false) String profile,
            @RequestParam(required = false) String quality,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        SectionVideoContext context = findSectionContext(sectionId).orElse(null);
        if (context == null) {
            return ResponseEntity.notFound().build();
        }

        verifyLearnerAccess(context.lesson(), user);

        UUID videoAssetId = resolveVideoAssetId(context.blockData());
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
                        Map.of(
                                "videoAssetId", videoAssetId.toString(),
                                "sectionId", sectionId
                        )
                )))
                .orElseGet(() -> ResponseEntity.badRequest().body(
                        Map.of("error", "No offline profile is available for this video asset")
                ));
    }

    ResponseEntity<Map<String, Object>> getDownloadUrl(
            String sectionId,
            String quality,
            UserJpaEntity user
    ) {
        return getDownloadUrl(sectionId, null, quality, user);
    }

    @GetMapping("/{sectionId}/video/sizes")
    @PreAuthorize("hasAnyRole('STUDENT','TEACHER','ADMIN','ORG_ADMIN')")
    public ResponseEntity<Map<String, Object>> getQualitySizes(
            @PathVariable String sectionId,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        SectionVideoContext context = findSectionContext(sectionId).orElse(null);
        if (context == null) {
            return ResponseEntity.notFound().build();
        }

        verifyLearnerAccess(context.lesson(), user);

        UUID videoAssetId = resolveVideoAssetId(context.blockData());
        if (videoAssetId == null) {
            return ResponseEntity.ok(Map.of(
                    "sizes", Map.of(),
                    "profiles", List.of(),
                    "videoSourceKind", "LEGACY_DIRECT",
                    "sectionId", sectionId
            ));
        }

        VideoAssetPresentationService.VideoAssetView assetView = videoAssetPresentationService.getView(videoAssetId).orElse(null);
        if (assetView == null) {
            return ResponseEntity.ok(Map.of(
                    "sizes", Map.of(),
                    "profiles", List.of(),
                    "videoSourceKind", "ADAPTIVE_R2",
                    "videoAssetId", videoAssetId.toString(),
                    "sectionId", sectionId
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
                "sectionId", sectionId
        ));
    }

    @DeleteMapping("/{sectionId}/video")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN','ORG_ADMIN')")
    public ResponseEntity<Void> deleteVideo(
            @PathVariable String sectionId,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        SectionVideoContext context = findSectionContext(sectionId).orElse(null);
        if (context == null) {
            return ResponseEntity.notFound().build();
        }

        verifyLessonOwnership(context.lesson().getId(), user);

        Map<String, Object> updatedData = new LinkedHashMap<>(context.blockData());
        updatedData.remove("videoAssetId");
        updatedData.remove("videoUrl");
        updatedData.remove("videoType");
        updatedData.remove("streamVideoUid");
        persistSectionData(context, updatedData);

        return ResponseEntity.noContent().build();
    }

    private Optional<SectionVideoContext> findSectionContext(String sectionId) {
        return lessonRepository.findByContentBlockId(sectionId)
                .flatMap(lesson -> {
                    List<ContentBlock> blocks = lesson.getContentBlocks();
                    if (blocks == null || blocks.isEmpty()) {
                        return Optional.empty();
                    }

                    int videoBlockCount = (int) blocks.stream()
                            .filter(block -> isVideoBlock(block.getType()))
                            .count();

                    for (int i = 0; i < blocks.size(); i++) {
                        ContentBlock block = blocks.get(i);
                        if (!sectionId.equals(block.getId())) {
                            continue;
                        }

                        Map<String, Object> blockData = block.getData() != null
                                ? new LinkedHashMap<>(block.getData())
                                : new LinkedHashMap<>();
                        return Optional.of(new SectionVideoContext(lesson, i, block, blockData, videoBlockCount));
                    }

                    return Optional.empty();
                });
    }

    private UUID resolveVideoAssetId(Map<String, Object> blockData) {
        if (blockData == null) {
            return null;
        }
        String value = asString(blockData.get("videoAssetId"));
        if (value == null) {
            return null;
        }
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private void persistSectionData(SectionVideoContext context, Map<String, Object> updatedData) {
        List<ContentBlock> blocks = new ArrayList<>(context.lesson().getContentBlocks());
        blocks.set(
                context.blockIndex(),
                ContentBlock.of(context.block().getId(), context.block().getType(), updatedData)
        );
        context.lesson().setContentBlocks(blocks);
        lessonRepository.save(context.lesson());
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

    private void verifyLessonOwnership(UUID lessonId, UserJpaEntity user) {
        if (user == null) {
            throw new AccessDeniedException("Authentication is required");
        }

        if (isAdminRole(user)) {
            return;
        }

        Course course = courseRepository.findByLessonId(lessonId)
                .orElseThrow(() -> new AccessDeniedException("Lesson is not attached to a course"));
        if (!course.getTeacherId().equals(user.getId())) {
            throw new AccessDeniedException("You do not have permission to modify this section video");
        }
    }

    private boolean isAdminRole(UserJpaEntity user) {
        return user.getRole() == UserJpaEntity.UserRole.ADMIN
                || user.getRole() == UserJpaEntity.UserRole.ORG_ADMIN;
    }

    private boolean isVideoBlock(String type) {
        return type != null && "VIDEO".equals(type.toUpperCase(Locale.ROOT));
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

    private String asString(Object value) {
        if (value == null) {
            return null;
        }
        String text = value.toString().trim();
        return text.isEmpty() ? null : text;
    }

    private record SectionVideoContext(
            LessonJpaEntity lesson,
            int blockIndex,
            ContentBlock block,
            Map<String, Object> blockData,
            int videoBlockCount
    ) {}
}

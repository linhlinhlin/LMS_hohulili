package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.course_authoring.infrastructure.persistence.entity.LessonJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository;
import com.example.lms.learning_delivery.infrastructure.service.CloudflareStreamService;
import com.example.lms.learning_delivery.infrastructure.service.CloudflareStreamService.CloudflareVideoMetadata;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Cloudflare Stream video endpoints for lessons.
 *
 * POST   /api/v3/lessons/{lessonId}/video          Teacher uploads video → CF Stream
 * GET    /api/v3/lessons/{lessonId}/video/play      Get signed playback URL (student/teacher)
 * GET    /api/v3/lessons/{lessonId}/video/download  Get quality-specific download URL (student)
 * GET    /api/v3/lessons/{lessonId}/video/sizes     Get per-quality file sizes for download dialog
 * DELETE /api/v3/lessons/{lessonId}/video          Teacher deletes video from CF Stream
 *
 * All endpoints are no-ops and return 503 when cloudflare.stream.enabled=false.
 */
@RestController
@RequestMapping("/api/v3/lessons")
@RequiredArgsConstructor
@Slf4j
public class LessonVideoControllerV3 {

    private final CloudflareStreamService cfStream;
    private final LessonJpaRepository lessonRepo;

    /**
     * Upload video to Cloudflare Stream.
     * Teacher only. Saves stream_video_uid to the lesson.
     */
    @PostMapping("/{lessonId}/video")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN','ORG_ADMIN')")
    public ResponseEntity<Map<String, Object>> uploadVideo(
            @PathVariable UUID lessonId,
            @RequestParam("file") MultipartFile file) {

        if (!cfStream.isEnabled()) {
            return ResponseEntity.status(503).body(Map.of(
                    "error", "Cloudflare Stream is not configured on this server"
            ));
        }

        LessonJpaEntity lesson = lessonRepo.findById(lessonId).orElse(null);
        if (lesson == null) {
            return ResponseEntity.notFound().build();
        }

        return cfStream.uploadVideo(file, lessonId.toString())
                .map(meta -> {
                    lesson.setStreamVideoUid(meta.uid());
                    lessonRepo.save(lesson);
                    log.info("CF Stream upload complete: lessonId={}, uid={}", lessonId, meta.uid());
                    Map<String, Object> body = new LinkedHashMap<>();
                    body.put("streamVideoUid", meta.uid());
                    body.put("playbackUrl", meta.hlsPlaybackUrl());
                    return ResponseEntity.ok(body);
                })
                .orElseGet(() -> ResponseEntity.internalServerError().body(
                        Map.of("error", "Video upload to Cloudflare Stream failed")
                ));
    }

    /**
     * Get a fresh signed HLS playback URL.
     * Student, teacher, admin. Token expires in ~4 hours.
     */
    @GetMapping("/{lessonId}/video/play")
    @PreAuthorize("hasAnyRole('STUDENT','TEACHER','ADMIN','ORG_ADMIN')")
    public ResponseEntity<Map<String, Object>> getPlayUrl(@PathVariable UUID lessonId) {
        LessonJpaEntity lesson = lessonRepo.findById(lessonId).orElse(null);
        if (lesson == null) return ResponseEntity.notFound().build();

        String uid = lesson.getStreamVideoUid();
        if (uid == null || uid.isBlank()) {
            return ResponseEntity.noContent().build();  // Lesson has no CF Stream video
        }

        return cfStream.getSignedPlaybackUrl(uid)
                .map(url -> ResponseEntity.ok(Map.<String, Object>of("playUrl", url, "uid", uid)))
                .orElseGet(() -> ResponseEntity.internalServerError().body(
                        Map.of("error", "Could not generate playback URL")
                ));
    }

    /**
     * Get quality-specific MP4 download URL for offline use.
     * Student only. Quality: 360p | 720p | 1080p
     */
    @GetMapping("/{lessonId}/video/download")
    @PreAuthorize("hasAnyRole('STUDENT','TEACHER','ADMIN','ORG_ADMIN')")
    public ResponseEntity<Map<String, Object>> getDownloadUrl(
            @PathVariable UUID lessonId,
            @RequestParam(defaultValue = "720p") String quality) {

        LessonJpaEntity lesson = lessonRepo.findById(lessonId).orElse(null);
        if (lesson == null) return ResponseEntity.notFound().build();

        String uid = lesson.getStreamVideoUid();
        if (uid == null || uid.isBlank()) return ResponseEntity.noContent().build();

        return cfStream.getDownloadUrl(uid, quality)
                .map(url -> ResponseEntity.ok(Map.<String, Object>of("downloadUrl", url, "quality", quality)))
                .orElseGet(() -> ResponseEntity.badRequest().body(
                        Map.of("error", "Unsupported quality or CF Stream not enabled: " + quality)
                ));
    }

    /**
     * Get per-quality file sizes (bytes) for the download dialog.
     * Replaces heuristic size estimates with real Cloudflare data.
     */
    @GetMapping("/{lessonId}/video/sizes")
    @PreAuthorize("hasAnyRole('STUDENT','TEACHER','ADMIN','ORG_ADMIN')")
    public ResponseEntity<Map<String, Object>> getQualitySizes(@PathVariable UUID lessonId) {
        LessonJpaEntity lesson = lessonRepo.findById(lessonId).orElse(null);
        if (lesson == null) return ResponseEntity.notFound().build();

        String uid = lesson.getStreamVideoUid();
        if (uid == null || uid.isBlank()) {
            return ResponseEntity.ok(Map.of("sizes", Map.of()));
        }

        Map<String, Long> sizes = cfStream.getQualitySizes(uid);
        return ResponseEntity.ok(Map.of("sizes", sizes, "uid", uid));
    }

    /**
     * Delete video from Cloudflare Stream.
     * Teacher/admin only. Clears stream_video_uid from lesson.
     */
    @DeleteMapping("/{lessonId}/video")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN','ORG_ADMIN')")
    public ResponseEntity<Void> deleteVideo(@PathVariable UUID lessonId) {
        LessonJpaEntity lesson = lessonRepo.findById(lessonId).orElse(null);
        if (lesson == null) return ResponseEntity.notFound().build();

        String uid = lesson.getStreamVideoUid();
        if (uid != null && !uid.isBlank()) {
            cfStream.deleteVideo(uid);
            lesson.setStreamVideoUid(null);
            lessonRepo.save(lesson);
        }
        return ResponseEntity.noContent().build();
    }
}

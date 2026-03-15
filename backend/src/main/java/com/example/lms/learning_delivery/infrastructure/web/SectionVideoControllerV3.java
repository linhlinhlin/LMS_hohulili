package com.example.lms.learning_delivery.infrastructure.web;

import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.LessonJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.learning_delivery.infrastructure.service.CloudflareStreamService;
import com.example.lms.shared.domain.model.ContentBlock;
import com.example.lms.shared.infrastructure.persistence.entity.PaymentTransactionJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.PaymentTransactionJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
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

    private final CloudflareStreamService cfStream;
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
        if (!cfStream.isEnabled()) {
            return ResponseEntity.status(503).body(Map.of(
                    "error", "Cloudflare Stream is not configured on this server"
            ));
        }

        SectionVideoContext context = findSectionContext(sectionId).orElse(null);
        if (context == null) {
            return ResponseEntity.notFound().build();
        }

        verifyLessonOwnership(context.lesson().getId(), user);

        return cfStream.uploadVideo(file, sectionId)
                .map(meta -> {
                    String existingUid = asString(context.blockData().get("streamVideoUid"));
                    if (existingUid != null && !existingUid.equals(meta.uid())) {
                        cfStream.deleteVideo(existingUid);
                    }

                    Map<String, Object> updatedData = new LinkedHashMap<>(context.blockData());
                    updatedData.put("streamVideoUid", meta.uid());
                    updatedData.put("videoUrl", meta.hlsPlaybackUrl());
                    updatedData.put("videoType", "CLOUDFLARE");
                    persistSectionData(context, updatedData);

                    log.info("CF Stream upload complete: lessonId={}, sectionId={}, uid={}",
                            context.lesson().getId(), sectionId, meta.uid());

                    return ResponseEntity.ok(Map.<String, Object>of(
                            "sectionId", sectionId,
                            "lessonId", context.lesson().getId().toString(),
                            "streamVideoUid", meta.uid(),
                            "playbackUrl", meta.hlsPlaybackUrl()
                    ));
                })
                .orElseGet(() -> ResponseEntity.internalServerError().body(
                        Map.of("error", "Video upload to Cloudflare Stream failed")
                ));
    }

    @GetMapping("/{sectionId}/video/play")
    @PreAuthorize("hasAnyRole('STUDENT','TEACHER','ADMIN','ORG_ADMIN')")
    public ResponseEntity<Map<String, Object>> getPlayUrl(
            @PathVariable String sectionId,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        SectionVideoContext context = findSectionContext(sectionId).orElse(null);
        if (context == null) {
            return ResponseEntity.notFound().build();
        }

        verifyLearnerAccess(context.lesson(), user);

        String uid = resolveSectionStreamUid(context).orElse(null);
        if (uid == null || uid.isBlank()) {
            return ResponseEntity.noContent().build();
        }

        return cfStream.getSignedPlaybackUrl(uid)
                .map(url -> ResponseEntity.ok(Map.<String, Object>of(
                        "playUrl", url,
                        "uid", uid,
                        "sectionId", sectionId
                )))
                .orElseGet(() -> ResponseEntity.internalServerError().body(
                        Map.of("error", "Could not generate playback URL")
                ));
    }

    @GetMapping("/{sectionId}/video/download")
    @PreAuthorize("hasAnyRole('STUDENT','TEACHER','ADMIN','ORG_ADMIN')")
    public ResponseEntity<Map<String, Object>> getDownloadUrl(
            @PathVariable String sectionId,
            @RequestParam(defaultValue = "720p") String quality,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        SectionVideoContext context = findSectionContext(sectionId).orElse(null);
        if (context == null) {
            return ResponseEntity.notFound().build();
        }

        verifyLearnerAccess(context.lesson(), user);

        String uid = resolveSectionStreamUid(context).orElse(null);
        if (uid == null || uid.isBlank()) {
            return ResponseEntity.noContent().build();
        }

        return cfStream.getDownloadUrl(uid, quality)
                .map(url -> ResponseEntity.ok(Map.<String, Object>of(
                        "downloadUrl", url,
                        "quality", quality,
                        "uid", uid,
                        "sectionId", sectionId
                )))
                .orElseGet(() -> ResponseEntity.badRequest().body(
                        Map.of("error", "Unsupported quality or CF Stream not enabled: " + quality)
                ));
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

        String uid = resolveSectionStreamUid(context).orElse(null);
        if (uid == null || uid.isBlank()) {
            return ResponseEntity.ok(Map.of("sizes", Map.of(), "sectionId", sectionId));
        }

        return ResponseEntity.ok(Map.of(
                "sizes", cfStream.getQualitySizes(uid),
                "uid", uid,
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

        Optional<String> sectionUid = Optional.ofNullable(asString(context.blockData().get("streamVideoUid")));
        Optional<String> resolvedUid = resolveSectionStreamUid(context);
        resolvedUid.ifPresent(cfStream::deleteVideo);

        Map<String, Object> updatedData = new LinkedHashMap<>(context.blockData());
        updatedData.remove("streamVideoUid");
        updatedData.remove("videoType");
        if (sectionUid.isPresent() || isInternalStreamUrl(asString(updatedData.get("videoUrl")))) {
            updatedData.remove("videoUrl");
        }
        persistSectionData(context, updatedData);

        if (sectionUid.isEmpty() && canUseLegacyLessonFallback(context)) {
            context.lesson().setStreamVideoUid(null);
            lessonRepository.save(context.lesson());
        }

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

    private Optional<String> resolveSectionStreamUid(SectionVideoContext context) {
        String sectionUid = asString(context.blockData().get("streamVideoUid"));
        if (sectionUid != null && !sectionUid.isBlank()) {
            return Optional.of(sectionUid);
        }

        if (canUseLegacyLessonFallback(context)) {
            String legacyUid = context.lesson().getStreamVideoUid();
            if (legacyUid != null && !legacyUid.isBlank()) {
                return Optional.of(legacyUid);
            }
        }

        return Optional.empty();
    }

    private boolean canUseLegacyLessonFallback(SectionVideoContext context) {
        return isVideoBlock(context.block().getType()) && context.videoBlockCount() == 1;
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
            throw new AccessDeniedException("You don't have permission to modify this section video");
        }
    }

    private boolean isAdminRole(UserJpaEntity user) {
        return user.getRole() == UserJpaEntity.UserRole.ADMIN
                || user.getRole() == UserJpaEntity.UserRole.ORG_ADMIN;
    }

    private boolean isVideoBlock(String type) {
        return type != null && "VIDEO".equals(type.toUpperCase(Locale.ROOT));
    }

    private String asString(Object value) {
        if (value == null) {
            return null;
        }
        String text = value.toString().trim();
        return text.isEmpty() ? null : text;
    }

    private boolean isInternalStreamUrl(String value) {
        return value != null && value.contains("videodelivery.net");
    }

    private record SectionVideoContext(
            LessonJpaEntity lesson,
            int blockIndex,
            ContentBlock block,
            Map<String, Object> blockData,
            int videoBlockCount
    ) {}
}

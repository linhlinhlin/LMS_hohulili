package com.example.lms.course_authoring.infrastructure.web;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.example.lms.course_authoring.application.usecase.CreateChapterUseCaseV3;
import com.example.lms.course_authoring.application.usecase.CreateLessonUseCaseV3;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.course_authoring.application.usecase.UpdateChapterUseCase;
import com.example.lms.course_authoring.application.usecase.DeleteChapterUseCase;
import com.example.lms.course_authoring.application.usecase.UpdateLessonUseCase;
import com.example.lms.course_authoring.application.usecase.DeleteLessonUseCase;
import com.example.lms.course_authoring.application.dto.UpdateChapterCommand;
import com.example.lms.course_authoring.application.dto.UpdateLessonCommand;
import com.example.lms.course_authoring.application.dto.ChapterResponse;
import com.example.lms.course_authoring.application.dto.LessonResponse;
import com.example.lms.course_authoring.application.dto.UpdateCourseCommand;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

/**
 * V3 Controller for Course Authoring.
 * Uses pure DDD patterns with command objects.
 */
@Slf4j
@Tag(name = "Course Authoring V3", description = "DDD-based course authoring endpoints")
@RestController
@RequestMapping("/api/v3/courses")
@RequiredArgsConstructor
public class CourseAuthoringControllerV3 {

    private final CreateChapterUseCaseV3 createChapterUseCase;
    private final CreateLessonUseCaseV3 createLessonUseCase;
    private final UpdateChapterUseCase updateChapterUseCase;
    private final DeleteChapterUseCase deleteChapterUseCase;
    private final UpdateLessonUseCase updateLessonUseCase;
    private final DeleteLessonUseCase deleteLessonUseCase;
    private final com.example.lms.course_authoring.application.usecase.ManageContentBlockUseCaseV3 manageContentBlockUseCase;
    private final com.example.lms.course_authoring.application.usecase.UpdateCourseUseCase updateCourseUseCase;
    private final com.example.lms.shared.infrastructure.service.FileManagementService fileManagementService;
    private final com.example.lms.shared.infrastructure.service.DocumentConversionService documentConversionService;
    private final com.example.lms.learning_delivery.infrastructure.service.VideoAssetLifecycleService videoAssetLifecycleService;
    private final com.example.lms.course_authoring.infrastructure.persistence.repository.ChapterJpaRepository chapterJpaRepository;
    private final com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository lessonJpaRepository;
    private final com.example.lms.course_authoring.domain.repository.CourseRepository courseRepository;
    private final com.example.lms.course_authoring.application.usecase.CourseDraftMutationUseCase courseDraftMutationUseCase;
    private final ObjectMapper objectMapper;
    private final com.example.lms.learning_delivery.infrastructure.persistence.ClassTeacherJpaRepository classTeacherJpaRepository;

    @Operation(summary = "Create a new chapter")
    @PostMapping("/{courseId}/chapters")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<UUID>> createChapter(
            @PathVariable UUID courseId,
            @Valid @RequestBody CreateChapterRequest request,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        boolean isAdmin = isAdminRole(user);
        var command = new CreateChapterUseCaseV3.CreateChapterCommand(
            courseId,
            request.title(),
            request.description(),
            request.orderIndex(),
            user.getId(),
            isAdmin
        );
        UUID chapterId = createChapterUseCase.execute(command);
        return ResponseEntity.ok(ApiResponse.success(chapterId, "Tạo chương thành công"));
    }

    @Operation(summary = "Create a new lesson in a chapter")
    @PostMapping("/chapters/{chapterId}/lessons")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<UUID>> createLesson(
            @PathVariable UUID chapterId,
            @Valid @RequestBody CreateLessonRequest request,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        enforceLessonVideoAuthoringPolicyOnCreate(request);
        // P0-11: Verify teacher owns the course via chapter
        verifyOwnershipByChapter(chapterId, user);
        var command = new CreateLessonUseCaseV3.CreateLessonCommand(
            chapterId,
            request.title(),
            request.description(),
            request.type(),
            request.videoUrl(),
            request.durationMinutes(),
            request.orderIndex(),
            request.isFree()
        );
        UUID lessonId = createLessonUseCase.execute(command);
        return ResponseEntity.ok(ApiResponse.success(lessonId, "Tạo bài học thành công"));
    }

    @Operation(summary = "Update a chapter")
    @PutMapping("/chapters/{chapterId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<ChapterResponse>> updateChapter(
            @PathVariable UUID chapterId,
            @Valid @RequestBody UpdateChapterRequest request,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        var command = new UpdateChapterCommand(
            request.courseId(),
            chapterId,
            user.getId(),
            request.title(),
            request.description(),
            isAdminRole(user)
        );
        ChapterResponse response = updateChapterUseCase.execute(command);
        return ResponseEntity.ok(ApiResponse.success(response, "Cập nhật chương thành công"));
    }

    @Operation(summary = "Delete a chapter")
    @DeleteMapping("/chapters/{chapterId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Void>> deleteChapter(
            @PathVariable UUID chapterId,
            @RequestParam UUID courseId,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        boolean isAdmin = isAdminRole(user);
        deleteChapterUseCase.execute(courseId, chapterId, user.getId(), isAdmin);
        return ResponseEntity.ok(ApiResponse.success(null, "Xóa chương thành công"));
    }

    @Operation(summary = "Update a lesson")
    @PutMapping("/lessons/{lessonId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<LessonResponse>> updateLesson(
            @PathVariable UUID lessonId,
            @Valid @RequestBody UpdateLessonRequest request,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        enforceLessonVideoAuthoringPolicyOnUpdate(lessonId, request);
        var command = new UpdateLessonCommand(
            request.courseId(),
            request.chapterId(),
            lessonId,
            user.getId(),
            request.title(),
            request.description(),
            request.lessonType(),
            request.content(),
            request.videoUrl(),
            request.durationMinutes(),
            request.isRequired(),
            request.isPreview(),
            isAdminRole(user)
        );
        LessonResponse response = updateLessonUseCase.execute(command);
        return ResponseEntity.ok(ApiResponse.success(response, "Cập nhật bài học thành công"));
    }

    @Operation(summary = "Delete a lesson")
    @DeleteMapping("/lessons/{lessonId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Void>> deleteLesson(
            @PathVariable UUID lessonId,
            @RequestParam UUID courseId,
            @RequestParam(required = false) UUID chapterId, // Optional - will scan chapters if null
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        boolean isAdmin = isAdminRole(user);
        UUID resolvedChapterId = chapterId != null
                ? chapterId
                : lessonJpaRepository.findById(lessonId)
                        .map(com.example.lms.course_authoring.infrastructure.persistence.entity.LessonJpaEntity::getChapterId)
                        .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Lesson", lessonId));
        deleteLessonUseCase.execute(courseId, resolvedChapterId, lessonId, user.getId(), isAdmin);
        return ResponseEntity.ok(ApiResponse.success(null, "Xóa bài học thành công"));
    }

    // ================================================================================================
    // Reorder Endpoints
    // ================================================================================================

    @Operation(summary = "Reorder chapters in a course")
    @PatchMapping("/chapters/reorder")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<ApiResponse<Void>> reorderChapters(
            @Valid @RequestBody ReorderChaptersRequest request,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        try {
            UUID courseId = UUID.fromString(request.courseId());
            verifyOwnership(courseId, user);
            courseDraftMutationUseCase.requireEditableCourse(courseId);
            var chapters = chapterJpaRepository.findByCourseIdOrderByOrderIndex(courseId);
            java.util.Map<UUID, com.example.lms.course_authoring.infrastructure.persistence.entity.ChapterJpaEntity> map = new java.util.HashMap<>();
            for (var ch : chapters) map.put(ch.getId(), ch);
            for (int i = 0; i < request.orderedIds().size(); i++) {
                var ch = map.get(UUID.fromString(request.orderedIds().get(i)));
                if (ch != null) ch.setOrderIndex(i);
            }
            chapterJpaRepository.saveAll(chapters);
            courseDraftMutationUseCase.markCourseChanged(courseId);
            return ResponseEntity.ok(ApiResponse.success(null, "Đã sắp xếp lại chương"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Định dạng UUID không hợp lệ"));
        }
    }

    @Operation(summary = "Reorder lessons in a chapter")
    @PatchMapping("/lessons/reorder")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<ApiResponse<Void>> reorderLessons(
            @Valid @RequestBody ReorderLessonsRequest request,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        try {
            UUID chapterId = UUID.fromString(request.chapterId());
            verifyOwnershipByChapter(chapterId, user);
            courseDraftMutationUseCase.requireEditableCourseByChapter(chapterId);
            var lessons = lessonJpaRepository.findByChapterIdOrderByOrderIndex(chapterId);
            java.util.Map<UUID, com.example.lms.course_authoring.infrastructure.persistence.entity.LessonJpaEntity> map = new java.util.HashMap<>();
            for (var l : lessons) map.put(l.getId(), l);
            for (int i = 0; i < request.orderedIds().size(); i++) {
                var l = map.get(UUID.fromString(request.orderedIds().get(i)));
                if (l != null) l.setOrderIndex(i);
            }
            lessonJpaRepository.saveAll(lessons);
            courseDraftMutationUseCase.markCourseChangedByChapter(chapterId);
            return ResponseEntity.ok(ApiResponse.success(null, "Đã sắp xếp lại bài học"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Định dạng UUID không hợp lệ"));
        }
    }

    @Operation(summary = "Reorder sections (content blocks) in a lesson")
    @PatchMapping("/sections/reorder")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Void>> reorderSections(
            @Valid @RequestBody ReorderSectionsRequest request,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        try {
            UUID lessonId = UUID.fromString(request.lessonId());
            verifyOwnershipByLesson(lessonId, user);
            var blocks = manageContentBlockUseCase.getBlocks(lessonId);
            java.util.Map<String, com.example.lms.shared.domain.model.ContentBlock> blockMap = new java.util.LinkedHashMap<>();
            for (var block : blocks) blockMap.put(block.getId(), block);
            java.util.List<com.example.lms.shared.domain.model.ContentBlock> reordered = new java.util.ArrayList<>();
            for (String id : request.orderedIds()) {
                var block = blockMap.get(id);
                if (block != null) reordered.add(block);
            }
            manageContentBlockUseCase.saveBlocks(lessonId, reordered);
            return ResponseEntity.ok(ApiResponse.success(null, "Đã sắp xếp lại phần học"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Định dạng UUID không hợp lệ"));
        }
    }

    // ================================================================================================
    // Section / ContentBlock Endpoints (Level 4 Hierarchy - Mapped to ContentBlock in Lesson)
    // ================================================================================================


    @Operation(summary = "Add a section (content block) to a lesson")
    @PostMapping(value = "/lessons/{lessonId}/sections", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<com.example.lms.shared.domain.model.ContentBlock>> addSection(
            @PathVariable UUID lessonId,
            @RequestPart("data") byte[] payloadBytes,
            @RequestPart(value = "file", required = false) org.springframework.web.multipart.MultipartFile file,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        final Map<String, Object> payload;
        try {
            payload = parseSectionPayload(payloadBytes);
        } catch (ResponseStatusException ex) {
            return ResponseEntity.status(ex.getStatusCode())
                    .body(ApiResponse.error(ex.getReason()));
        }
        // Process file upload and inject URL into payload
        if (file != null && !file.isEmpty()) {
            log.debug("Received file: {}", file.getOriginalFilename());
            try {
                var attachment = fileManagementService.uploadFile(file, "sections", user.getId());
                payload.put("fileUrl", attachment.getFileUrl());
                payload.put("fileName", file.getOriginalFilename());
                // Mark for async conversion (copy bytes before multipart cleanup)
                if (documentConversionService.canConvert(file.getOriginalFilename())) {
                    payload.put("previewStatus", "PROCESSING");
                    payload.put("_convBytes", file.getBytes());
                    payload.put("_convName", file.getOriginalFilename());
                }
            } catch (java.io.IOException e) {
                log.error("File upload failed for section", e);
                return ResponseEntity.badRequest().body(ApiResponse.error("Tải file thất bại: " + e.getMessage()));
            }
        }

        try {
            enforceVideoSectionAuthoringPolicy(lessonId, null, payload, user);
        } catch (ResponseStatusException ex) {
            return ResponseEntity.status(ex.getStatusCode())
                    .body(ApiResponse.error(ex.getReason()));
        }

        String type = (String) payload.getOrDefault("type", "TEXT");
        log.debug("Processing addSection for lesson: {}, type: {}", lessonId, type);
        boolean isAdmin = isAdminRole(user);
        // Extract conversion data before save (removed from payload to keep JSON clean)
        final byte[] convBytes = (byte[]) payload.remove("_convBytes");
        final String convName = (String) payload.remove("_convName");

        com.example.lms.shared.domain.model.ContentBlock block = manageContentBlockUseCase.addBlock(lessonId, type, payload, user.getId(), isAdmin);

        String fileUrl = (String) payload.get("fileUrl");
        if (fileUrl != null) {
            fileManagementService.linkFileByUrl(fileUrl, lessonId, "LESSON");
        }

        if (convBytes != null) {
            scheduleAsyncPreviewConversion(block.getId().toString(), lessonId, convBytes, convName, user.getId());
        }

return ResponseEntity.ok(ApiResponse.success(block, "Tạo phần học thành công"));
    }

    @Operation(summary = "Update a section (content block)")
    @PutMapping(value = "/lessons/{lessonId}/sections/{sectionId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<com.example.lms.shared.domain.model.ContentBlock>> updateSection(
            @PathVariable UUID lessonId,
            @PathVariable String sectionId,
            @RequestPart("data") byte[] payloadBytes,
            @RequestPart(value = "file", required = false) org.springframework.web.multipart.MultipartFile file,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        final Map<String, Object> payload;
        try {
            payload = parseSectionPayload(payloadBytes);
        } catch (ResponseStatusException ex) {
            return ResponseEntity.status(ex.getStatusCode())
                    .body(ApiResponse.error(ex.getReason()));
        }
        // Diagnostic log của #267 era đã removed — root cause #277 (multipart
        // UTF-8 encoding) đã identified và fix qua parseSectionPayload(byte[]).
        // Process file upload and inject URL into payload
        if (file != null && !file.isEmpty()) {
            log.debug("Received file for update: {}", file.getOriginalFilename());
            try {
                var attachment = fileManagementService.uploadFile(file, "sections", user.getId());
                payload.put("fileUrl", attachment.getFileUrl());
                payload.put("fileName", file.getOriginalFilename());
                // Mark for async conversion (copy bytes before multipart cleanup)
                if (documentConversionService.canConvert(file.getOriginalFilename())) {
                    payload.put("previewStatus", "PROCESSING");
                    payload.put("_convBytes", file.getBytes());
                    payload.put("_convName", file.getOriginalFilename());
                }
            } catch (java.io.IOException e) {
                log.error("File upload failed for section update", e);
                return ResponseEntity.badRequest().body(ApiResponse.error("Tải file thất bại: " + e.getMessage()));
            }
        }

        try {
            enforceVideoSectionAuthoringPolicy(lessonId, sectionId, payload, user);
        } catch (ResponseStatusException ex) {
            return ResponseEntity.status(ex.getStatusCode())
                    .body(ApiResponse.error(ex.getReason()));
        }

        boolean isAdmin = isAdminRole(user);
        final byte[] convBytes2 = (byte[]) payload.remove("_convBytes");
        final String convName2 = (String) payload.remove("_convName");

        com.example.lms.shared.domain.model.ContentBlock block = manageContentBlockUseCase.updateBlock(lessonId, sectionId, payload, user.getId(), isAdmin);

        String fileUrl2 = (String) payload.get("fileUrl");
        if (fileUrl2 != null) {
            fileManagementService.linkFileByUrl(fileUrl2, lessonId, "LESSON");
        }

        if (convBytes2 != null) {
            scheduleAsyncPreviewConversion(sectionId, lessonId, convBytes2, convName2, user.getId());
        }

return ResponseEntity.ok(ApiResponse.success(block, "Cập nhật phần học thành công"));
    }

    @Operation(summary = "Delete a section (content block)")
    @DeleteMapping("/lessons/{lessonId}/sections/{sectionId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Void>> deleteSection(
            @PathVariable UUID lessonId,
            @PathVariable String sectionId,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        boolean isAdmin = isAdminRole(user);
        manageContentBlockUseCase.deleteBlock(lessonId, sectionId, user.getId(), isAdmin);
        return ResponseEntity.ok(ApiResponse.success(null, "Xóa phần học thành công"));
    }

    @Operation(summary = "Update course details")
    @PutMapping("/{courseId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<com.example.lms.course_authoring.application.dto.CourseResponse>> updateCourse(
            @PathVariable UUID courseId,
            @Valid @RequestBody UpdateCourseRequest request,
            @AuthenticationPrincipal UserJpaEntity user
    ) {
        enforceIntroVideoAuthoringPolicy(courseId, request);
        if (request.introVideoAssetId() != null) {
            videoAssetLifecycleService.requireAccessibleAsset(request.introVideoAssetId(), user);
        }
        var command = new com.example.lms.course_authoring.application.dto.UpdateCourseCommand(
            courseId,
            user.getId(),
            request.title(),
            request.description(),
            request.thumbnailUrl(),
            request.categoryId(),
            request.tags(),
            request.welcomeMessage(),
            request.courseInformation(),
            request.benefits(),
            request.introVideoUrl(),
            request.introVideoAssetId(),
            request.credits(),
            request.visibility(),
            request.priceType(),
            request.price(),
            request.salePrice(),
            request.deliveryMode(),
            request.allowOfflineDownload(),
            isAdminRole(user)
        );
        com.example.lms.course_authoring.application.dto.CourseResponse response = updateCourseUseCase.execute(command);
        return ResponseEntity.ok(ApiResponse.success(response, "Cập nhật khóa học thành công"));
    }
    
    // --- Helpers ---

    /**
     * Parse multipart "data" part as JSON với UTF-8 forced.
     *
     * <p>Spring {@code @RequestPart("data") String} dùng StringHttpMessageConverter,
     * mà default charset cho {@code application/*} (no explicit charset) là
     * ISO-8859-1 per HTTP RFC 7231. JSON content UTF-8 sẽ bị decode như Latin1
     * → mojibake Vietnamese diacritics ({@code Hàng Hải} → {@code H?ng H?i}).</p>
     *
     * <p>Nhận {@code byte[]} thay vì {@code String} → Jackson
     * {@link ObjectMapper#readValue(byte[], TypeReference)} parse trực tiếp với
     * UTF-8 (Jackson default per JSON RFC 8259), bỏ qua charset declaration của
     * client. Defensive với mọi multipart client.</p>
     *
     * @see <a href="https://github.com/spring-projects/spring-framework/issues/22788">Spring multipart UTF-8 quirk</a>
     */
    private Map<String, Object> parseSectionPayload(byte[] payloadBytes) {
        try {
            return objectMapper.readValue(payloadBytes, new TypeReference<>() {});
        } catch (IOException ex) {
            log.warn("Invalid multipart section payload", ex);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payload phần học không hợp lệ");
        }
    }

    private void enforceVideoSectionAuthoringPolicy(
            UUID lessonId,
            String sectionId,
            Map<String, Object> payload,
            UserJpaEntity user
    ) {
        String type = asString(payload.get("type"));
        if (!"VIDEO".equalsIgnoreCase(type)) {
            return;
        }

        String videoAssetId = normalizeText(asString(payload.get("videoAssetId")));
        if (videoAssetId != null) {
            UUID assetId = parseUuidOrBadRequest(videoAssetId, "Video asset ID khong hop le");
            try {
                videoAssetLifecycleService.requireAccessibleAsset(assetId, user);
            } catch (IllegalArgumentException ex) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Video asset duoc chon khong ton tai hoac khong con hop le",
                        ex
                );
            }

            payload.put("videoAssetId", assetId.toString());
            payload.remove("videoUrl");
            payload.remove("videoType");
            payload.remove("streamVideoUid");
            payload.remove("cfObjectKey");
            return;
        }

        String streamVideoUid = normalizeText(asString(payload.get("streamVideoUid")));
        if (streamVideoUid != null) {
            if (sectionId == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Muc video moi phai di qua upload noi bo va video asset. Khong the gan streamVideoUid thu cong."
                );
            }

            var existingBlock = manageContentBlockUseCase.getBlocks(lessonId).stream()
                    .filter(block -> block.getId().equals(sectionId))
                    .findFirst()
                    .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("ContentBlock", sectionId));

            String existingStreamUid = normalizeText(asString(existingBlock.getData().get("streamVideoUid")));
            if (java.util.Objects.equals(streamVideoUid, existingStreamUid)) {
                return;
            }

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Khong the gan streamVideoUid thu cong cho muc video. Hay tai video len noi bo de tao video asset."
            );
        }

        String videoUrl = normalizeText(asString(payload.get("videoUrl")));
        if (videoUrl == null) {
            return;
        }

        // Allow YouTube URLs (both create and update) — tracked via IFrame API
        String videoType = normalizeText(asString(payload.get("videoType")));
        if ("YOUTUBE".equalsIgnoreCase(videoType) && isYouTubeUrl(videoUrl)) {
            payload.remove("videoAssetId");
            payload.remove("streamVideoUid");
            payload.remove("cfObjectKey");
            return;
        }

        // Block all other external URLs (direct MP4, legacy, etc.)
        if (sectionId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Mục video mới chỉ hỗ trợ tải lên nội bộ hoặc YouTube. URL video trực tiếp không được hỗ trợ."
            );
        }

        var existingBlock = manageContentBlockUseCase.getBlocks(lessonId).stream()
                .filter(block -> block.getId().equals(sectionId))
                .findFirst()
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("ContentBlock", sectionId));

        String existingVideoUrl = normalizeText(asString(existingBlock.getData().get("videoUrl")));
        String existingStreamUid = normalizeText(asString(existingBlock.getData().get("streamVideoUid")));
        if (existingStreamUid != null) {
            return;
        }

        if (java.util.Objects.equals(videoUrl, existingVideoUrl)) {
            return;
        }

        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Không thể gán URL video ngoài mới cho mục video. Hãy tải video lên nội bộ hoặc dùng YouTube."
        );
    }

    private static final java.util.regex.Pattern YOUTUBE_URL_PATTERN = java.util.regex.Pattern.compile(
            "(?:https?://)?(?:www\\.)?(?:youtube\\.com/(?:watch\\?v=|embed/|shorts/)|youtu\\.be/)[a-zA-Z0-9_-]{11}"
    );

    private boolean isYouTubeUrl(String url) {
        return url != null && YOUTUBE_URL_PATTERN.matcher(url).find();
    }

    /**
     * Schedule async document-to-PDF conversion (Coursera pattern).
     * Section saves instantly with previewStatus=PROCESSING.
     * Background thread converts via Gotenberg → updates ContentBlock data.
     */
    private void scheduleAsyncPreviewConversion(
            String blockId, UUID lessonId, byte[] fileBytes, String fileName, UUID userId) {
        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                log.info("[DocConvert] Starting async conversion: {} ({}B)", fileName, fileBytes.length);
                byte[] pdfBytes = documentConversionService.convertToPdf(fileBytes, fileName);
                if (pdfBytes == null) {
                    log.warn("[DocConvert] Conversion returned null for {}", fileName);
                    manageContentBlockUseCase.patchBlockData(lessonId, blockId,
                            java.util.Map.of("previewStatus", "FAILED"));
                    return;
                }

                String pdfName = fileName.replaceAll("\\.[^.]+$", "") + "_preview.pdf";
                var pdfFile = com.example.lms.shared.infrastructure.util.ByteArrayMultipartFile.of(
                        "preview", pdfName, "application/pdf", pdfBytes);
                var pdfAttachment = fileManagementService.uploadFile(pdfFile, "previews", userId);

                manageContentBlockUseCase.patchBlockData(lessonId, blockId,
                        java.util.Map.of(
                                "previewPdfUrl", pdfAttachment.getFileUrl(),
                                "previewStatus", "READY"
                        ));

                log.info("[DocConvert] Async done: {} → {} ({}B)", fileName, pdfAttachment.getFileUrl(), pdfBytes.length);
            } catch (Exception e) {
                log.error("[DocConvert] Async failed for {}: {}", fileName, e.getMessage());
                try {
                    manageContentBlockUseCase.patchBlockData(lessonId, blockId,
                            java.util.Map.of("previewStatus", "FAILED"));
                } catch (Exception ignore) {}
            }
        });
    }

    private UUID parseUuidOrBadRequest(String value, String message) {
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message, ex);
        }
    }

    private void enforceLessonVideoAuthoringPolicyOnCreate(CreateLessonRequest request) {
        String requestedVideoUrl = normalizeText(request.videoUrl());
        if (requestedVideoUrl == null) {
            return;
        }

        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Lesson video mới không còn hỗ trợ URL ngoài hoặc direct MP4 legacy. Hãy tạo mục video và tải video lên nội bộ qua asset pipeline."
        );
    }

    private void enforceLessonVideoAuthoringPolicyOnUpdate(UUID lessonId, UpdateLessonRequest request) {
        String requestedVideoUrl = normalizeText(request.videoUrl());
        if (requestedVideoUrl == null) {
            return;
        }

        var lesson = lessonJpaRepository.findById(lessonId)
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Lesson", lessonId));
        String existingVideoUrl = normalizeText(lesson.getVideoUrl());
        if (java.util.Objects.equals(requestedVideoUrl, existingVideoUrl)) {
            return;
        }

        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Không thể gán lesson-level video mới bằng URL ngoài hoặc direct MP4 legacy. Hãy chuyển sang video section tải lên nội bộ."
        );
    }

    private void enforceIntroVideoAuthoringPolicy(UUID courseId, UpdateCourseRequest request) {
        if (request.introVideoAssetId() != null) {
            return;
        }

        String requestedIntroVideoUrl = normalizeText(request.introVideoUrl());
        if (requestedIntroVideoUrl == null) {
            return;
        }

        var course = courseRepository.findById(courseId)
                .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Course", courseId));
        String existingIntroVideoUrl = normalizeText(course.getIntroVideoUrl());
        if (java.util.Objects.equals(requestedIntroVideoUrl, existingIntroVideoUrl)) {
            return;
        }

        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Video giới thiệu mới cần đi qua upload nội bộ và video asset. Liên kết ngoài chỉ còn được giữ cho nội dung legacy hiện có."
        );
    }

    private String asString(Object value) {
        return value instanceof String str ? str : null;
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private boolean isAdminRole(UserJpaEntity user) {
        return user.getRole() == UserJpaEntity.UserRole.ADMIN;
    }

    private void verifyOwnership(UUID courseId, UserJpaEntity user) {
        if (isAdminRole(user)) return;
        var course = courseRepository.findById(courseId)
            .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Course", courseId));
        if (!course.getTeacherId().equals(user.getId())
                && !classTeacherJpaRepository.existsByTeacherIdAndCourseId(user.getId(), courseId)) {
            throw new org.springframework.security.access.AccessDeniedException("Bạn không có quyền truy cập khóa học này");
        }
    }

    private void verifyOwnershipByChapter(UUID chapterId, UserJpaEntity user) {
        if (isAdminRole(user)) return;
        var course = courseRepository.findByChapterId(chapterId)
            .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Course", chapterId));
        if (!course.getTeacherId().equals(user.getId())
                && !classTeacherJpaRepository.existsByTeacherIdAndCourseId(user.getId(), course.getId())) {
            throw new org.springframework.security.access.AccessDeniedException("Bạn không có quyền truy cập khóa học này");
        }
    }

    private void verifyOwnershipByLesson(UUID lessonId, UserJpaEntity user) {
        if (isAdminRole(user)) return;
        var course = courseRepository.findByLessonId(lessonId)
            .orElseThrow(() -> new com.example.lms.shared.exception.EntityNotFoundException("Course", lessonId));
        if (!course.getTeacherId().equals(user.getId())
                && !classTeacherJpaRepository.existsByTeacherIdAndCourseId(user.getId(), course.getId())) {
            throw new org.springframework.security.access.AccessDeniedException("Bạn không có quyền truy cập khóa học này");
        }
    }

    // Request DTOs
    public record CreateChapterRequest(
        @NotBlank(message = "Tiêu đề không được để trống")
        String title,
        String description,
        Integer orderIndex
    ) {}

    public record CreateLessonRequest(
        @NotBlank(message = "Tiêu đề không được để trống")
        String title,
        String description,
        String type,
        String videoUrl,
        Integer durationMinutes,
        Integer orderIndex,
        Boolean isFree
    ) {}

    public record UpdateChapterRequest(
        UUID courseId,
        String title,
        String description,
        Integer orderIndex
    ) {}

    public record UpdateLessonRequest(
        UUID courseId,
        UUID chapterId,
        String title,
        String description,
        String lessonType,
        String content,
        String videoUrl,
        Integer durationMinutes,
        Boolean isRequired,
        Boolean isPreview
    ) {}

    public record UpdateCourseRequest(
        @jakarta.validation.constraints.Size(max = 255, message = "Tiêu đề không được quá 255 ký tự") String title,
        String description,
        String thumbnailUrl,
        UUID categoryId,
        java.util.Set<String> tags,
        String welcomeMessage,
        String courseInformation,
        String benefits,
        String introVideoUrl,
        UUID introVideoAssetId,
        @jakarta.validation.constraints.Min(value = 0, message = "Số tín chỉ phải >= 0") @jakarta.validation.constraints.Max(value = 30, message = "Số tín chỉ phải <= 30") Integer credits,
        String visibility,
        String priceType,
        @jakarta.validation.constraints.DecimalMin(value = "0", message = "Giá phải >= 0") java.math.BigDecimal price,
        @jakarta.validation.constraints.DecimalMin(value = "0", message = "Giá khuyến mãi phải >= 0") java.math.BigDecimal salePrice,
        String deliveryMode,
        Boolean allowOfflineDownload
    ) {}

    public record ReorderChaptersRequest(
        @NotBlank(message = "Mã khóa học không được để trống") String courseId,
        @jakarta.validation.constraints.NotEmpty(message = "Danh sách ID không được để trống") java.util.List<String> orderedIds
    ) {}

    public record ReorderLessonsRequest(
        @NotBlank(message = "Mã khóa học không được để trống") String courseId,
        @NotBlank(message = "Mã chương không được để trống") String chapterId,
        @jakarta.validation.constraints.NotEmpty(message = "Danh sách ID không được để trống") java.util.List<String> orderedIds
    ) {}

    public record ReorderSectionsRequest(
        @NotBlank(message = "Mã bài học không được để trống") String lessonId,
        @jakarta.validation.constraints.NotEmpty(message = "Danh sách ID không được để trống") java.util.List<String> orderedIds
    ) {}
}

// New controller for categories and instructors
@Tag(name = "Course Authoring Support V3", description = "Support endpoints for course authoring")
@RestController
@RequestMapping("/api/v3")
@RequiredArgsConstructor
class CourseAuthoringSupportControllerV3 {

    private final com.example.lms.course_authoring.infrastructure.persistence.repository.CourseCategoryJpaRepository courseCategoryJpaRepository;

    @Operation(summary = "Get all course categories (backward-compatible flat list)")
    @GetMapping("/categories")
    @org.springframework.cache.annotation.Cacheable(value = "categories")
    public ResponseEntity<ApiResponse<java.util.List<CategoryDTO>>> getCategories() {
        var categories = courseCategoryJpaRepository.findByParentIdIsNullOrderBySortOrder().stream()
            .map(c -> new CategoryDTO(c.getId().toString(), c.getCode(), c.getName(), c.getPrefix()))
            .toList();
        return ResponseEntity.ok(ApiResponse.success(categories, "Danh sach danh muc"));
    }

    // NOTE: getInstructors is now handled by UserControllerV3 at /api/v3/users/instructors

    // DTOs
    public record CategoryDTO(String id, String code, String name, String prefix) {}

}

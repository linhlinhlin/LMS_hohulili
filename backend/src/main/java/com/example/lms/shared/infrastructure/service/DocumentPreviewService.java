package com.example.lms.shared.infrastructure.service;

import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.LessonJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.ClassTeacherJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.shared.domain.model.ContentBlock;
import com.example.lms.shared.infrastructure.persistence.entity.FileAttachmentJpaEntity;
import com.example.lms.shared.infrastructure.persistence.entity.PaymentTransactionJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.FileAttachmentJpaRepository;
import com.example.lms.shared.infrastructure.persistence.repository.PaymentTransactionJpaRepository;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.ArrayDeque;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.Deque;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Creates cached PDF previews for Office documents that already exist in storage.
 *
 * New authoring uploads are converted by CourseAuthoringControllerV3. This service
 * covers legacy/published content where the section has only a PPTX/DOCX/XLSX URL.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentPreviewService {

    private static final String STATUS_READY = "READY";
    private static final String STATUS_PROCESSING = "PROCESSING";
    private static final String STATUS_FAILED = "FAILED";
    private static final String STATUS_RATE_LIMITED = "RATE_LIMITED";
    private static final long MAX_SOURCE_BYTES = 600L * 1024L * 1024L;
    private static final long FAILURE_TTL_MILLIS = 10L * 60L * 1000L;
    private static final int MAX_CONCURRENT_CONVERSIONS = 2;
    private static final int MAX_QUEUED_CONVERSIONS = 8;
    private static final int MAX_USER_CONVERSION_STARTS = 5;
    private static final long USER_RATE_WINDOW_MILLIS = 10L * 60L * 1000L;
    private static final Set<String> CONVERTIBLE_EXTENSIONS = Set.of(
            "doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp", "rtf", "txt", "csv"
    );

    private final Optional<R2StorageService> r2StorageService;
    private final Optional<LocalStorageService> localStorageService;
    private final DocumentConversionService documentConversionService;
    private final FileAttachmentJpaRepository fileAttachmentRepository;
    private final LessonJpaRepository lessonRepository;
    private final CourseRepository courseRepository;
    private final JpaEnrollmentRepository enrollmentRepository;
    private final PaymentTransactionJpaRepository paymentRepository;
    private final ClassTeacherJpaRepository classTeacherRepository;
    private final UserJpaRepository userRepository;
    private final ConcurrentMap<String, Boolean> activeConversions = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, PreviewFailure> failedConversions = new ConcurrentHashMap<>();
    private final ConcurrentMap<UUID, Deque<Long>> userConversionStarts = new ConcurrentHashMap<>();
    private final ExecutorService previewExecutor = createPreviewExecutor();

    @Value("${cloudflare.r2.public-url:}")
    private String r2PublicUrl;

    @Value("${app.storage.local.base-url:http://localhost:8088/uploads}")
    private String localBaseUrl;

    public PreviewResult requestPreview(UUID lessonId, String sectionId, UserJpaEntity user) {
        ResolvedPreviewRequest request = resolvePreviewRequest(lessonId, sectionId, user);
        if (hasText(request.existingPreviewPdfUrl())) {
            return new PreviewResult(STATUS_READY, request.existingPreviewPdfUrl(), null);
        }

        SourceDocument source = request.source();
        if (!documentConversionService.isEnabled()) {
            return new PreviewResult(STATUS_FAILED, null, "Document conversion service is not configured");
        }
        if (!CONVERTIBLE_EXTENSIONS.contains(source.extension())) {
            return new PreviewResult(STATUS_FAILED, null, "Unsupported document type");
        }
        if (source.fileSize() != null && source.fileSize() > MAX_SOURCE_BYTES) {
            return new PreviewResult(STATUS_FAILED, null, "Document is too large to preview");
        }

        String previewKey = buildPreviewKey(source.storageKey());
        if (storageExists(previewKey)) {
            failedConversions.remove(source.storageKey());
            return new PreviewResult(STATUS_READY, resolvePublicUrl(previewKey), null);
        }

        PreviewFailure recentFailure = recentFailure(source.storageKey());
        if (recentFailure != null) {
            return new PreviewResult(STATUS_FAILED, null, recentFailure.message());
        }

        if (activeConversions.putIfAbsent(source.storageKey(), Boolean.TRUE) == null) {
            UUID userId = user != null ? user.getId() : null;
            if (!tryAcquireUserConversionSlot(userId)) {
                activeConversions.remove(source.storageKey());
                return new PreviewResult(STATUS_RATE_LIMITED, null, "Too many document preview requests");
            }
            try {
                previewExecutor.execute(() -> generatePreview(source, previewKey, userId));
            } catch (RejectedExecutionException ex) {
                activeConversions.remove(source.storageKey());
                releaseLatestUserConversionSlot(userId);
                return new PreviewResult(STATUS_RATE_LIMITED, null, "Document preview queue is full");
            }
        }

        return new PreviewResult(STATUS_PROCESSING, null, null);
    }

    @PreDestroy
    void shutdownExecutor() {
        previewExecutor.shutdownNow();
    }

    private void generatePreview(SourceDocument source, String previewKey, UUID userId) {
        Path sourceFile = null;
        Path pdfFile = null;
        try {
            sourceFile = Files.createTempFile("lms-doc-preview-source-", "." + source.extension());
            pdfFile = Files.createTempFile("lms-doc-preview-output-", ".pdf");

            downloadToFile(source.storageKey(), sourceFile);
            byte[] pdfBytes = documentConversionService.convertToPdf(sourceFile, source.originalName());
            if (pdfBytes == null || pdfBytes.length == 0) {
                log.warn("[DocPreview] Conversion returned empty output for {}", source.storageKey());
                recordFailure(source.storageKey(), "Could not create document preview");
                return;
            }

            Files.write(pdfFile, pdfBytes);
            R2StorageService.UploadResult stored = uploadGeneratedPreview(pdfFile, previewKey);
            ensureAttachmentRecord(stored, source, userId);
            failedConversions.remove(source.storageKey());
            log.info("[DocPreview] Cached preview {} -> {}", source.storageKey(), stored.publicUrl());
        } catch (Exception e) {
            log.error("[DocPreview] Failed to create preview for {}: {}", source.storageKey(), e.getMessage());
            recordFailure(source.storageKey(), "Could not create document preview");
        } finally {
            activeConversions.remove(source.storageKey());
            deleteQuietly(sourceFile);
            deleteQuietly(pdfFile);
        }
    }

    private ResolvedPreviewRequest resolvePreviewRequest(UUID lessonId, String sectionId, UserJpaEntity user) {
        if (lessonId == null) {
            throw new IllegalArgumentException("lessonId is required");
        }
        if (sectionId == null || sectionId.isBlank()) {
            throw new IllegalArgumentException("sectionId is required");
        }

        LessonJpaEntity lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new IllegalArgumentException("Lesson not found"));
        Course course = courseRepository.findByLessonId(lessonId)
                .orElseThrow(() -> new IllegalArgumentException("Course not found"));
        verifyLessonContentAccess(course, lesson, user);

        ContentBlock block = lesson.getContentBlocks() != null
                ? lesson.getContentBlocks().stream()
                    .filter(candidate -> sectionId.equals(candidate.getId()))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Section not found"))
                : null;
        if (block == null) {
            throw new IllegalArgumentException("Section not found");
        }
        if (block.getType() == null || !"FILE".equalsIgnoreCase(block.getType())) {
            throw new IllegalArgumentException("Section is not a file document");
        }

        Map<String, Object> data = block.getData() != null ? block.getData() : Map.of();
        String existingPreviewPdfUrl = stringValue(data.get("previewPdfUrl"));
        String existingPreviewStatus = stringValue(data.get("previewStatus"));
        if (hasText(existingPreviewPdfUrl)
                && (!hasText(existingPreviewStatus) || STATUS_READY.equalsIgnoreCase(existingPreviewStatus))) {
            return new ResolvedPreviewRequest(null, existingPreviewPdfUrl);
        }

        String fileUrl = stringValue(data.get("fileUrl"));
        if (!hasText(fileUrl)) {
            throw new IllegalArgumentException("Section file URL is missing");
        }
        return new ResolvedPreviewRequest(resolveSourceDocument(fileUrl), null);
    }

    private void verifyLessonContentAccess(Course course, LessonJpaEntity lesson, UserJpaEntity user) {
        if (user == null) {
            throw new AccessDeniedException("Authentication is required");
        }
        if (isSystemAdminRole(user) || hasOrgScopedCourseAccess(course, user) || isCourseTeacher(course, user)) {
            return;
        }

        boolean isPublicAndApproved = course.getVisibility() == Course.Visibility.PUBLIC
                && course.getStatus() == Course.CourseStatus.APPROVED;
        if (!isPublicAndApproved && !isEnrolledInCourse(user.getId(), course.getId())) {
            throw new AccessDeniedException("You do not have access to this course");
        }

        boolean lessonFree = Boolean.TRUE.equals(lesson.getIsFree());
        if (lessonFree || isCourseContentUnlocked(course, user)) {
            return;
        }

        throw new AccessDeniedException("You do not have access to this lesson content");
    }

    private boolean isCourseContentUnlocked(Course course, UserJpaEntity user) {
        boolean isFreeOrZero = (course.getPrice() == null || course.getPrice().compareTo(BigDecimal.ZERO) <= 0)
                || (course.getSalePrice() != null && course.getSalePrice().compareTo(BigDecimal.ZERO) <= 0);
        if (isFreeOrZero) return true;

        return paymentRepository.existsByStudentIdAndCourseIdAndStatus(
                user.getId(), course.getId(), PaymentTransactionJpaEntity.PaymentStatus.COMPLETED)
                || isEnrolledInCourse(user.getId(), course.getId());
    }

    private boolean isSystemAdminRole(UserJpaEntity user) {
        return user != null && user.getRole() == UserJpaEntity.UserRole.ADMIN;
    }

    private boolean isCourseTeacher(Course course, UserJpaEntity user) {
        if (course == null || user == null || user.getRole() != UserJpaEntity.UserRole.TEACHER) {
            return false;
        }
        return Objects.equals(course.getTeacherId(), user.getId())
                || classTeacherRepository.existsByTeacherIdAndCourseId(user.getId(), course.getId());
    }

    private boolean hasOrgScopedCourseAccess(Course course, UserJpaEntity user) {
        if (course == null || user == null || user.getRole() != UserJpaEntity.UserRole.ORG_ADMIN
                || user.getOrganizationId() == null || course.getTeacherId() == null) {
            return false;
        }
        return userRepository.findById(course.getTeacherId())
                .map(teacher -> Objects.equals(teacher.getOrganizationId(), user.getOrganizationId()))
                .orElse(false);
    }

    private boolean isEnrolledInCourse(UUID userId, UUID courseId) {
        return enrollmentRepository.findByStudentIdAndCourseId(userId, courseId).isPresent();
    }

    private SourceDocument resolveSourceDocument(String fileUrl) {
        if (fileUrl == null || fileUrl.isBlank()) {
            throw new IllegalArgumentException("fileUrl is required");
        }

        String normalizedUrl = stripQueryAndFragment(fileUrl.trim());
        Optional<FileAttachmentJpaEntity> attachment = fileAttachmentRepository.findByFileUrl(normalizedUrl);
        if (attachment.isPresent()) {
            FileAttachmentJpaEntity file = attachment.get();
            String storageKey = validateStorageKey(file.getFileName());
            String originalName = file.getOriginalName() != null && !file.getOriginalName().isBlank()
                    ? file.getOriginalName()
                    : fileNameFromStorageKey(storageKey);
            return new SourceDocument(
                    storageKey,
                    originalName,
                    extensionOf(originalName, storageKey),
                    file.getFileSize()
            );
        }

        String storageKey = extractStorageKey(normalizedUrl)
                .orElseThrow(() -> new IllegalArgumentException("Unsupported document URL"));
        return new SourceDocument(
                validateStorageKey(storageKey),
                fileNameFromStorageKey(storageKey),
                extensionOf(storageKey, storageKey),
                null
        );
    }

    private Optional<String> extractStorageKey(String url) {
        String r2Key = extractStorageKey(url, r2PublicUrl);
        if (r2Key != null) return Optional.of(r2Key);

        String localKey = extractStorageKey(url, localBaseUrl);
        if (localKey != null) return Optional.of(localKey);

        return Optional.empty();
    }

    private String extractStorageKey(String url, String baseUrl) {
        if (baseUrl == null || baseUrl.isBlank()) {
            return null;
        }
        String normalizedBase = stripTrailingSlash(baseUrl.trim());
        if (!url.startsWith(normalizedBase + "/")) {
            return null;
        }
        String key = url.substring(normalizedBase.length() + 1);
        return URLDecoder.decode(key, StandardCharsets.UTF_8);
    }

    private String validateStorageKey(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            throw new IllegalArgumentException("Invalid storage key");
        }
        String key = storageKey.replace('\\', '/');
        if (key.startsWith("/") || key.contains("../") || key.contains("..\\") || key.length() > 500) {
            throw new IllegalArgumentException("Invalid storage key");
        }
        return key;
    }

    private void downloadToFile(String storageKey, Path destination) throws IOException {
        if (r2StorageService.isPresent()) {
            r2StorageService.get().downloadToFile(storageKey, destination);
            return;
        }
        if (localStorageService.isPresent()) {
            localStorageService.get().downloadToFile(storageKey, destination);
            return;
        }
        throw new IllegalStateException("No storage service configured");
    }

    private boolean storageExists(String storageKey) {
        if (r2StorageService.isPresent()) {
            return r2StorageService.get().exists(storageKey);
        }
        return localStorageService.map(service -> service.exists(storageKey)).orElse(false);
    }

    private R2StorageService.UploadResult uploadGeneratedPreview(Path pdfFile, String previewKey) throws IOException {
        if (r2StorageService.isPresent()) {
            return r2StorageService.get().upload(pdfFile, previewKey, "application/pdf");
        }
        if (localStorageService.isPresent()) {
            return localStorageService.get().upload(pdfFile, previewKey, "application/pdf");
        }
        throw new IllegalStateException("No storage service configured");
    }

    private String resolvePublicUrl(String storageKey) {
        if (r2StorageService.isPresent()) {
            return r2StorageService.get().resolvePublicUrl(storageKey);
        }
        if (localStorageService.isPresent()) {
            return localStorageService.get().resolvePublicUrl(storageKey);
        }
        throw new IllegalStateException("No storage service configured");
    }

    private void ensureAttachmentRecord(R2StorageService.UploadResult stored, SourceDocument source, UUID userId) {
        String previewUrl = stored.publicUrl();
        if (fileAttachmentRepository.findByFileName(stored.storageKey()).isPresent()
                || fileAttachmentRepository.findByFileUrl(previewUrl).isPresent()) {
            return;
        }

        FileAttachmentJpaEntity attachment = FileAttachmentJpaEntity.builder()
                .fileUrl(previewUrl)
                .fileName(stored.storageKey())
                .originalName(source.originalName().replaceAll("\\.[^.]+$", "") + "_preview.pdf")
                .fileSize(stored.fileSize())
                .contentType("application/pdf")
                .uploadedBy(userId)
                .fileCategory("DOCUMENT_PREVIEW")
                .status("ACTIVE")
                .build();
        fileAttachmentRepository.save(attachment);
    }

    private String buildPreviewKey(String sourceStorageKey) {
        String digest = sha256Hex(sourceStorageKey);
        return "previews/" + digest + ".pdf";
    }

    private PreviewFailure recentFailure(String storageKey) {
        PreviewFailure failure = failedConversions.get(storageKey);
        if (failure == null) {
            return null;
        }
        if (System.currentTimeMillis() - failure.failedAtMillis() > FAILURE_TTL_MILLIS) {
            failedConversions.remove(storageKey, failure);
            return null;
        }
        return failure;
    }

    private void recordFailure(String storageKey, String message) {
        failedConversions.put(storageKey, new PreviewFailure(message, System.currentTimeMillis()));
    }

    private boolean tryAcquireUserConversionSlot(UUID userId) {
        if (userId == null) {
            return false;
        }
        long now = System.currentTimeMillis();
        Deque<Long> starts = userConversionStarts.computeIfAbsent(userId, ignored -> new ArrayDeque<>());
        synchronized (starts) {
            pruneOldStarts(starts, now);
            if (starts.size() >= MAX_USER_CONVERSION_STARTS) {
                return false;
            }
            starts.addLast(now);
            return true;
        }
    }

    private void releaseLatestUserConversionSlot(UUID userId) {
        if (userId == null) {
            return;
        }
        Deque<Long> starts = userConversionStarts.get(userId);
        if (starts == null) {
            return;
        }
        synchronized (starts) {
            starts.pollLast();
        }
    }

    private void pruneOldStarts(Deque<Long> starts, long now) {
        while (!starts.isEmpty() && now - starts.peekFirst() > USER_RATE_WINDOW_MILLIS) {
            starts.pollFirst();
        }
    }

    private String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }

    private String extensionOf(String originalName, String storageKey) {
        String name = originalName != null && originalName.contains(".") ? originalName : storageKey;
        int dot = name.lastIndexOf('.');
        return dot >= 0 && dot < name.length() - 1
                ? name.substring(dot + 1).toLowerCase(Locale.ROOT)
                : "";
    }

    private String fileNameFromStorageKey(String storageKey) {
        int slash = storageKey.lastIndexOf('/');
        return slash >= 0 ? storageKey.substring(slash + 1) : storageKey;
    }

    private String stripQueryAndFragment(String url) {
        int query = url.indexOf('?');
        int hash = url.indexOf('#');
        int end = url.length();
        if (query >= 0) end = Math.min(end, query);
        if (hash >= 0) end = Math.min(end, hash);
        return url.substring(0, end);
    }

    private String stripTrailingSlash(String value) {
        while (value.endsWith("/")) {
            value = value.substring(0, value.length() - 1);
        }
        return value;
    }

    private void deleteQuietly(Path path) {
        if (path == null) return;
        try {
            Files.deleteIfExists(path);
        } catch (IOException ignored) {
        }
    }

    private String stringValue(Object value) {
        return value instanceof String text ? text.trim() : null;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static ExecutorService createPreviewExecutor() {
        AtomicInteger threadCounter = new AtomicInteger();
        ThreadFactory threadFactory = runnable -> {
            Thread thread = new Thread(runnable, "document-preview-" + threadCounter.incrementAndGet());
            thread.setDaemon(true);
            return thread;
        };
        return new ThreadPoolExecutor(
                MAX_CONCURRENT_CONVERSIONS,
                MAX_CONCURRENT_CONVERSIONS,
                0L,
                TimeUnit.MILLISECONDS,
                new ArrayBlockingQueue<>(MAX_QUEUED_CONVERSIONS),
                threadFactory,
                new ThreadPoolExecutor.AbortPolicy()
        );
    }

    private record ResolvedPreviewRequest(SourceDocument source, String existingPreviewPdfUrl) {}
    private record SourceDocument(String storageKey, String originalName, String extension, Long fileSize) {}
    private record PreviewFailure(String message, long failedAtMillis) {}

    public record PreviewResult(String status, String previewPdfUrl, String message) {
        public boolean isProcessing() {
            return STATUS_PROCESSING.equals(status);
        }

        public boolean isRateLimited() {
            return STATUS_RATE_LIMITED.equals(status);
        }

        public Map<String, Object> toMap() {
            return Map.of(
                    "status", status,
                    "previewPdfUrl", previewPdfUrl == null ? "" : previewPdfUrl,
                    "message", message == null ? "" : message
            );
        }
    }
}

package com.example.lms.shared.infrastructure.service;

import com.example.lms.shared.infrastructure.persistence.entity.FileAttachmentJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.FileAttachmentJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

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
    private static final long MAX_SOURCE_BYTES = 600L * 1024L * 1024L;
    private static final long FAILURE_TTL_MILLIS = 10L * 60L * 1000L;
    private static final Set<String> CONVERTIBLE_EXTENSIONS = Set.of(
            "doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp", "rtf", "txt", "csv"
    );

    private final Optional<R2StorageService> r2StorageService;
    private final Optional<LocalStorageService> localStorageService;
    private final DocumentConversionService documentConversionService;
    private final FileAttachmentJpaRepository fileAttachmentRepository;
    private final ConcurrentMap<String, Boolean> activeConversions = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, PreviewFailure> failedConversions = new ConcurrentHashMap<>();

    @Value("${cloudflare.r2.public-url:}")
    private String r2PublicUrl;

    @Value("${app.storage.local.base-url:http://localhost:8088/uploads}")
    private String localBaseUrl;

    public PreviewResult requestPreview(String fileUrl, UUID userId) {
        SourceDocument source = resolveSourceDocument(fileUrl);
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
            CompletableFuture.runAsync(() -> generatePreview(source, previewKey, userId));
        }

        return new PreviewResult(STATUS_PROCESSING, null, null);
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

    private record SourceDocument(String storageKey, String originalName, String extension, Long fileSize) {}
    private record PreviewFailure(String message, long failedAtMillis) {}

    public record PreviewResult(String status, String previewPdfUrl, String message) {
        public Map<String, Object> toMap() {
            return Map.of(
                    "status", status,
                    "previewPdfUrl", previewPdfUrl == null ? "" : previewPdfUrl,
                    "message", message == null ? "" : message
            );
        }
    }
}

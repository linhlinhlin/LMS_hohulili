package com.example.lms.learning_delivery.infrastructure.service;

import com.example.lms.shared.infrastructure.persistence.entity.FileAttachmentJpaEntity;
import com.example.lms.shared.infrastructure.service.LocalStorageService;
import com.example.lms.shared.infrastructure.service.R2StorageService;
import com.example.lms.shared.infrastructure.service.R2VideoStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Arrays;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor(onConstructor_ = @Autowired)
public class VideoBinaryStorageService {

    private static final String PRIVATE_VIDEO_SCHEME = "video-private://";

    private final Optional<R2VideoStorageService> r2VideoStorageService;
    private final Optional<R2StorageService> r2StorageService;
    private final Optional<LocalStorageService> localStorageService;

    public SourceBinary materializeSource(FileAttachmentJpaEntity attachment, UUID assetId) throws IOException {
        Path tempFile = Files.createTempFile("video-asset-" + assetId + "-", suffixFromName(attachment.getOriginalName()));
        String storageKey = attachment.getFileName();

        try {
            if (shouldUsePrivateVideoStorage(attachment.getFileUrl(), attachment.getFileCategory()) && r2VideoStorageService.isPresent()) {
                r2VideoStorageService.get().downloadToFile(storageKey, tempFile);
            } else if (r2StorageService.isPresent()) {
                r2StorageService.get().downloadToFile(storageKey, tempFile);
            } else if (localStorageService.isPresent()) {
                localStorageService.get().downloadToFile(storageKey, tempFile);
            } else {
                throw new IOException("No storage backend configured to materialize source video");
            }
        } catch (IOException ex) {
            Files.deleteIfExists(tempFile);
            throw ex;
        }

        return new SourceBinary(
                tempFile,
                storageKey,
                attachment.getFileUrl(),
                attachment.getContentType(),
                attachment.getFileSize()
        );
    }

    public StoredBinary storeGenerated(Path sourceFile, String storageKey, String contentType) throws IOException {
        if (r2VideoStorageService.isPresent()) {
            r2VideoStorageService.get().upload(sourceFile, storageKey, contentType);
            return new StoredBinary(storageKey, r2VideoStorageService.get().resolveInternalUrl(storageKey), Files.size(sourceFile));
        }
        if (localStorageService.isPresent()) {
            R2StorageService.UploadResult result = localStorageService.get().upload(sourceFile, storageKey, contentType);
            return new StoredBinary(result.storageKey(), result.publicUrl(), result.fileSize());
        }
        if (r2StorageService.isPresent()) {
            R2StorageService.UploadResult result = r2StorageService.get().upload(sourceFile, storageKey, contentType);
            return new StoredBinary(result.storageKey(), result.publicUrl(), result.fileSize());
        }
        throw new IOException("No storage backend configured to persist generated rendition");
    }

    public StoredBinary storeGenerated(byte[] content, String storageKey, String contentType) throws IOException {
        if (r2VideoStorageService.isPresent()) {
            r2VideoStorageService.get().upload(content, storageKey, contentType);
            return new StoredBinary(storageKey, r2VideoStorageService.get().resolveInternalUrl(storageKey), content.length);
        }

        Path tempFile = Files.createTempFile("video-generated-", suffixFromStorageKey(storageKey));
        try {
            Files.write(tempFile, content);
            return storeGenerated(tempFile, storageKey, contentType);
        } finally {
            Files.deleteIfExists(tempFile);
        }
    }

    public String readUtf8(String storageKey) throws IOException {
        if (r2VideoStorageService.isPresent()) {
            return r2VideoStorageService.get().readUtf8(storageKey);
        }

        Path tempFile = Files.createTempFile("video-manifest-", suffixFromStorageKey(storageKey));
        try {
            if (r2StorageService.isPresent()) {
                r2StorageService.get().downloadToFile(storageKey, tempFile);
                return Files.readString(tempFile, StandardCharsets.UTF_8);
            }
            if (localStorageService.isPresent()) {
                localStorageService.get().downloadToFile(storageKey, tempFile);
                return Files.readString(tempFile, StandardCharsets.UTF_8);
            }
            throw new IOException("No storage backend configured to read generated manifest");
        } finally {
            Files.deleteIfExists(tempFile);
        }
    }

    public String createReadUrl(String storageKey, Duration ttl) {
        if (r2VideoStorageService.isPresent()) {
            return r2VideoStorageService.get().presignGet(storageKey, ttl);
        }
        if (r2StorageService.isPresent()) {
            return r2StorageService.get().resolvePublicUrl(storageKey);
        }
        if (localStorageService.isPresent()) {
            return localStorageService.get().resolvePublicUrl(storageKey);
        }
        return null;
    }

    public boolean exists(String storageKey) {
        if (r2VideoStorageService.isPresent()) {
            return r2VideoStorageService.get().exists(storageKey);
        }
        if (r2StorageService.isPresent()) {
            return r2StorageService.get().exists(storageKey);
        }
        return localStorageService.map(service -> service.exists(storageKey)).orElse(false);
    }

    /**
     * Return object size + content-type (HEAD without body transfer).
     * Falls back through R2 video bucket → R2 general bucket → local FS.
     */
    public R2VideoStorageService.ObjectMetadata head(String storageKey) throws IOException {
        if (r2VideoStorageService.isPresent()) {
            return r2VideoStorageService.get().head(storageKey);
        }
        if (r2StorageService.isPresent()) {
            // Fallback: probe via getObject HEAD-like call (R2StorageService doesn't expose head)
            // For minimal change, materialise to temp file and read length.
            Path tempFile = Files.createTempFile("video-head-", suffixFromStorageKey(storageKey));
            try {
                r2StorageService.get().downloadToFile(storageKey, tempFile);
                return new R2VideoStorageService.ObjectMetadata(Files.size(tempFile), Files.probeContentType(tempFile));
            } finally {
                Files.deleteIfExists(tempFile);
            }
        }
        if (localStorageService.isPresent()) {
            Path local = Path.of("uploads").resolve(storageKey);
            if (Files.exists(local)) {
                return new R2VideoStorageService.ObjectMetadata(Files.size(local), Files.probeContentType(local));
            }
        }
        throw new IOException("No storage backend configured to head object");
    }

    public R2VideoStorageService.ObjectBytes readObject(String storageKey, String rangeHeader) throws IOException {
        if (r2VideoStorageService.isPresent()) {
            return r2VideoStorageService.get().read(storageKey, rangeHeader);
        }

        Path tempFile = Files.createTempFile("video-object-", suffixFromStorageKey(storageKey));
        try {
            if (r2StorageService.isPresent()) {
                r2StorageService.get().downloadToFile(storageKey, tempFile);
                return readLocalObject(tempFile, rangeHeader);
            }
            if (localStorageService.isPresent()) {
                localStorageService.get().downloadToFile(storageKey, tempFile);
                return readLocalObject(tempFile, rangeHeader);
            }
            throw new IOException("No storage backend configured to read generated object");
        } finally {
            Files.deleteIfExists(tempFile);
        }
    }

    public void delete(String storageKey) {
        if (r2VideoStorageService.isPresent()) {
            r2VideoStorageService.get().delete(storageKey);
            return;
        }
        if (r2StorageService.isPresent()) {
            r2StorageService.get().delete(storageKey);
            return;
        }
        localStorageService.ifPresent(service -> service.delete(storageKey));
    }

    public int deletePrefix(String storagePrefix) {
        if (storagePrefix == null || storagePrefix.isBlank()) {
            return 0;
        }
        if (r2VideoStorageService.isPresent()) {
            return r2VideoStorageService.get().deleteByPrefix(storagePrefix);
        }
        return localStorageService.map(service -> service.deleteByPrefix(storagePrefix)).orElse(0);
    }

    public String resolveCanonicalUrl(String storageKey) {
        if (r2VideoStorageService.isPresent()) {
            return r2VideoStorageService.get().resolveInternalUrl(storageKey);
        }
        if (r2StorageService.isPresent()) {
            return r2StorageService.get().resolvePublicUrl(storageKey);
        }
        if (localStorageService.isPresent()) {
            return localStorageService.get().resolvePublicUrl(storageKey);
        }
        return null;
    }

    public boolean isPrivateVideoUrl(String fileUrl) {
        return fileUrl != null && fileUrl.startsWith(PRIVATE_VIDEO_SCHEME);
    }

    public String extractStorageKey(String fileUrl, String fallbackStorageKey) {
        if (isPrivateVideoUrl(fileUrl)) {
            return fileUrl.substring(PRIVATE_VIDEO_SCHEME.length());
        }
        return fallbackStorageKey;
    }

    private boolean shouldUsePrivateVideoStorage(String fileUrl, String fileCategory) {
        return isPrivateVideoUrl(fileUrl) || "VIDEO".equalsIgnoreCase(fileCategory);
    }

    private String suffixFromName(String originalName) {
        if (originalName == null || !originalName.contains(".")) {
            return ".bin";
        }
        return originalName.substring(originalName.lastIndexOf('.'));
    }

    private String suffixFromStorageKey(String storageKey) {
        if (storageKey == null || !storageKey.contains(".")) {
            return ".bin";
        }
        return storageKey.substring(storageKey.lastIndexOf('.'));
    }

    private R2VideoStorageService.ObjectBytes readLocalObject(Path file, String rangeHeader) throws IOException {
        byte[] allBytes = Files.readAllBytes(file);
        String contentType = Files.probeContentType(file);
        ByteRange range = parseByteRange(rangeHeader, allBytes.length);
        if (range == null) {
            return new R2VideoStorageService.ObjectBytes(allBytes, allBytes.length, contentType, null);
        }

        byte[] bytes = Arrays.copyOfRange(allBytes, (int) range.start(), (int) range.end() + 1);
        String contentRange = "bytes " + range.start() + "-" + range.end() + "/" + allBytes.length;
        return new R2VideoStorageService.ObjectBytes(bytes, bytes.length, contentType, contentRange);
    }

    private ByteRange parseByteRange(String rangeHeader, long size) throws IOException {
        if (rangeHeader == null || rangeHeader.isBlank()) {
            return null;
        }
        String value = rangeHeader.trim();
        if (!value.startsWith("bytes=") || value.contains(",")) {
            return null;
        }

        String spec = value.substring("bytes=".length());
        int dashIndex = spec.indexOf('-');
        if (dashIndex < 0) {
            return null;
        }

        String startPart = spec.substring(0, dashIndex).trim();
        String endPart = spec.substring(dashIndex + 1).trim();
        if (startPart.isBlank() && endPart.isBlank()) {
            return null;
        }

        try {
            long start;
            long end;
            if (startPart.isBlank()) {
                long suffixLength = Long.parseLong(endPart);
                if (suffixLength <= 0) {
                    return null;
                }
                start = Math.max(0, size - suffixLength);
                end = size - 1;
            } else {
                start = Long.parseLong(startPart);
                end = endPart.isBlank() ? size - 1 : Long.parseLong(endPart);
            }

            if (start < 0 || end < start || start >= size) {
                throw new IOException("Invalid Range header for video object");
            }
            return new ByteRange(start, Math.min(end, size - 1));
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private record ByteRange(long start, long end) {}

    public record SourceBinary(
            Path path,
            String storageKey,
            String fileUrl,
            String contentType,
            Long fileSize
    ) {}

    public record StoredBinary(
            String storageKey,
            String fileUrl,
            long fileSize
    ) {}
}

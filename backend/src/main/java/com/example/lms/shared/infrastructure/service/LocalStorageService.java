package com.example.lms.shared.infrastructure.service;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

/**
 * Local filesystem storage service — DEV ONLY.
 *
 * SOTA hardening (Phase 6+7): activated only when {@code cloudflare.r2.enabled=false}
 * is EXPLICIT (no longer {@code matchIfMissing=true}). A production env that forgot to
 * set the R2 credentials will now fail fast at boot with "no storage service configured"
 * instead of silently falling back to ephemeral container disk.
 *
 * Files are stored in {@code uploads/{folder}/{uuid}.{ext}} and served via WebConfig.
 */
@Service
@Slf4j
@ConditionalOnProperty(name = "cloudflare.r2.enabled", havingValue = "false")
public class LocalStorageService {

    @Value("${app.storage.local.base-path:uploads}")
    private String basePath;

    @Value("${app.storage.local.base-url:http://localhost:8088/uploads}")
    private String baseUrl;

    @PostConstruct
    void init() throws IOException {
        Path dir = Path.of(basePath);
        if (!Files.exists(dir)) {
            Files.createDirectories(dir);
            log.info("[LocalStorage] Created base directory: {}", dir.toAbsolutePath());
        }
        log.info("[LocalStorage] Active - base-path={}, base-url={}", basePath, baseUrl);
    }

    public R2StorageService.UploadResult upload(MultipartFile file, String folder) throws IOException {
        String fileId = UUID.randomUUID().toString();
        String extension = getExtension(file.getOriginalFilename());
        String key = buildKey(folder, fileId, extension);

        Path targetDir = resolveAndValidate(folder);
        Files.createDirectories(targetDir);

        Path targetFile = resolveAndValidate(key);
        Files.copy(file.getInputStream(), targetFile, StandardCopyOption.REPLACE_EXISTING);

        String publicUrl = resolvePublicUrl(key);
        log.info("[LocalStorage] Uploaded {} ({} bytes) -> {}", key, file.getSize(), publicUrl);
        return new R2StorageService.UploadResult(fileId, publicUrl, key, file.getSize());
    }

    public R2StorageService.UploadResult upload(Path file, String storageKey, String contentType) throws IOException {
        Path targetFile = resolveAndValidate(storageKey);
        if (targetFile.getParent() != null) {
            Files.createDirectories(targetFile.getParent());
        }

        Files.copy(file, targetFile, StandardCopyOption.REPLACE_EXISTING);
        long fileSize = Files.size(targetFile);
        String publicUrl = resolvePublicUrl(storageKey);

        log.info("[LocalStorage] Uploaded generated file {} ({} bytes) -> {}", storageKey, fileSize, publicUrl);
        return new R2StorageService.UploadResult(storageKey, publicUrl, storageKey, fileSize);
    }

    public void delete(String key) {
        try {
            Path file = resolveAndValidate(key);
            if (Files.deleteIfExists(file)) {
                log.info("[LocalStorage] Deleted {}", key);
            } else {
                log.warn("[LocalStorage] File not found for deletion: {}", key);
            }
        } catch (IOException e) {
            log.error("[LocalStorage] Failed to delete {}", key, e);
        }
    }

    public boolean exists(String key) {
        try {
            return Files.exists(resolveAndValidate(key));
        } catch (IOException e) {
            return false;
        }
    }

    public void downloadToFile(String key, Path destination) throws IOException {
        if (destination.getParent() != null) {
            Files.createDirectories(destination.getParent());
        }
        Files.copy(resolveAndValidate(key), destination, StandardCopyOption.REPLACE_EXISTING);
    }

    public String resolvePublicUrl(String key) {
        return baseUrl + "/" + key;
    }

    private Path resolveAndValidate(String key) throws IOException {
        Path base = Path.of(basePath).toAbsolutePath().normalize();
        Path resolved = base.resolve(key).normalize();
        if (!resolved.startsWith(base)) {
            throw new IOException("Invalid storage key: path traversal detected");
        }
        return resolved;
    }

    private String buildKey(String folder, String fileId, String extension) {
        if (folder == null || folder.isBlank()) {
            return fileId + extension;
        }
        return folder + "/" + fileId + extension;
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf(".")).toLowerCase();
    }
}

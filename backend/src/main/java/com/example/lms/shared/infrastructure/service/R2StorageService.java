package com.example.lms.shared.infrastructure.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

/**
 * Cloudflare R2 Storage Service.
 * Handles file uploads, downloads, and deletions to the configured bucket.
 */
@Service
@ConditionalOnProperty(name = "cloudflare.r2.enabled", havingValue = "true", matchIfMissing = false)
public class R2StorageService {

    private final S3Client r2Client;

    @Value("${cloudflare.r2.bucket}")
    private String bucket;

    @Value("${cloudflare.r2.public-url}")
    private String publicUrl;

    public R2StorageService(S3Client r2Client) {
        this.r2Client = r2Client;
    }

    public UploadResult upload(MultipartFile file, String folder) throws IOException {
        String fileId = UUID.randomUUID().toString();
        String extension = getExtension(file.getOriginalFilename());
        String key = buildKey(folder, fileId, extension);

        r2Client.putObject(
                PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .contentType(file.getContentType())
                        .contentLength(file.getSize())
                        .build(),
                RequestBody.fromInputStream(file.getInputStream(), file.getSize())
        );

        return new UploadResult(fileId, resolvePublicUrl(key), key, file.getSize());
    }

    public UploadResult upload(Path file, String storageKey, String contentType) throws IOException {
        long fileSize = Files.size(file);
        r2Client.putObject(
                PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(storageKey)
                        .contentType(contentType)
                        .contentLength(fileSize)
                        .build(),
                RequestBody.fromFile(file)
        );

        return new UploadResult(storageKey, resolvePublicUrl(storageKey), storageKey, fileSize);
    }

    public void delete(String key) {
        r2Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .build());
    }

    public boolean exists(String key) {
        try {
            r2Client.headObject(HeadObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .build());
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        }
    }

    public void downloadToFile(String key, Path destination) throws IOException {
        if (destination.getParent() != null) {
            Files.createDirectories(destination.getParent());
        }
        // The AWS SDK target path must not already exist when using Path-based downloads.
        Files.deleteIfExists(destination);
        r2Client.getObject(
                GetObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .build(),
                destination
        );
    }

    public String resolvePublicUrl(String key) {
        return publicUrl + "/" + key;
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

    public record UploadResult(
            String fileId,
            String publicUrl,
            String storageKey,
            long fileSize
    ) {}
}

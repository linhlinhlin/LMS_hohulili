package com.example.lms.shared.infrastructure.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.io.IOException;
import java.util.UUID;

/**
 * Cloudflare R2 Storage Service
 * Handles file uploads, downloads, and deletions to R2 bucket.
 *
 * This service is conditional and only activates when cloudflare.r2.enabled=true
 */
@Service
@ConditionalOnProperty(name = "cloudflare.r2.enabled", havingValue = "true", matchIfMissing = false)
public class R2StorageService {

    private final S3Client r2Client;

    @Value("${cloudflare.r2.bucket}")
    private String bucket;

    @Value("${cloudflare.r2.public-url}")
    private String publicUrl; // e.g., https://pub-xxx.r2.dev

    public R2StorageService(S3Client r2Client) {
        this.r2Client = r2Client;
    }

    /**
     * Upload a file to R2 storage.
     * Returns the file ID and public URL.
     */
    public UploadResult upload(MultipartFile file, String folder) throws IOException {
        String fileId = UUID.randomUUID().toString();
        String extension = getExtension(file.getOriginalFilename());
        String key = buildKey(folder, fileId, extension);

        // Upload to R2
        r2Client.putObject(
                PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .contentType(file.getContentType())
                        .contentLength(file.getSize())
                        .build(),
                RequestBody.fromInputStream(file.getInputStream(), file.getSize())
        );

        String publicFileUrl = publicUrl + "/" + key;
        
        return new UploadResult(fileId, publicFileUrl, key, file.getSize());
    }

    /**
     * Delete a file from R2 storage by its key.
     */
    public void delete(String key) {
        r2Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .build());
    }

    /**
     * Check if a file exists in R2.
     */
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

    /**
     * Result of an upload operation.
     */
    public record UploadResult(
            String fileId,
            String publicUrl,
            String storageKey,
            long fileSize
    ) {}
}

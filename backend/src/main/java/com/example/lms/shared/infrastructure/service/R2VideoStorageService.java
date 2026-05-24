package com.example.lms.shared.infrastructure.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectsRequest;
import software.amazon.awssdk.services.s3.model.AbortMultipartUploadRequest;
import software.amazon.awssdk.services.s3.model.CompleteMultipartUploadRequest;
import software.amazon.awssdk.services.s3.model.CompletedMultipartUpload;
import software.amazon.awssdk.services.s3.model.CompletedPart;
import software.amazon.awssdk.services.s3.model.CreateMultipartUploadRequest;
import software.amazon.awssdk.services.s3.model.CreateMultipartUploadResponse;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.ObjectIdentifier;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.UploadPartRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.UploadPartPresignRequest;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@ConditionalOnProperty(name = "cloudflare.r2.enabled", havingValue = "true", matchIfMissing = false)
public class R2VideoStorageService {

    private final S3Client r2Client;
    private final S3Presigner r2Presigner;

    @Value("${cloudflare.r2.video-bucket}")
    private String videoBucket;

    public R2VideoStorageService(S3Client r2Client, S3Presigner r2Presigner) {
        this.r2Client = r2Client;
        this.r2Presigner = r2Presigner;
    }

    public UploadResult upload(MultipartFile file, String folder) throws IOException {
        String fileId = UUID.randomUUID().toString();
        String extension = getExtension(file.getOriginalFilename());
        String storageKey = buildKey(folder, fileId, extension);

        r2Client.putObject(
                PutObjectRequest.builder()
                        .bucket(videoBucket)
                        .key(storageKey)
                        .contentType(file.getContentType())
                        .contentLength(file.getSize())
                        .build(),
                RequestBody.fromInputStream(file.getInputStream(), file.getSize())
        );

        return new UploadResult(fileId, storageKey, resolveInternalUrl(storageKey), file.getSize());
    }

    public void upload(Path file, String storageKey, String contentType) throws IOException {
        long fileSize = Files.size(file);
        r2Client.putObject(
                PutObjectRequest.builder()
                        .bucket(videoBucket)
                        .key(storageKey)
                        .contentType(contentType)
                        .contentLength(fileSize)
                        .build(),
                RequestBody.fromFile(file)
        );
    }

    public void upload(byte[] content, String storageKey, String contentType) {
        r2Client.putObject(
                PutObjectRequest.builder()
                        .bucket(videoBucket)
                        .key(storageKey)
                        .contentType(contentType)
                        .contentLength((long) content.length)
                        .build(),
                RequestBody.fromBytes(content)
        );
    }

    public boolean exists(String storageKey) {
        try {
            r2Client.headObject(HeadObjectRequest.builder()
                    .bucket(videoBucket)
                    .key(storageKey)
                    .build());
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        }
    }

    /**
     * Read object size + content-type without transferring the body.
     * Used by the playback controller's HEAD handler so the browser can probe
     * range support without following a presigned-GET redirect (which would
     * fail SigV4 because presigned URLs are method-bound).
     */
    public ObjectMetadata head(String storageKey) {
        var resp = r2Client.headObject(HeadObjectRequest.builder()
                .bucket(videoBucket)
                .key(storageKey)
                .build());
        return new ObjectMetadata(
                resp.contentLength() == null ? 0L : resp.contentLength(),
                resp.contentType()
        );
    }

    public record ObjectMetadata(long size, String contentType) {}

    public ObjectBytes read(String storageKey, String rangeHeader) {
        GetObjectRequest.Builder request = GetObjectRequest.builder()
                .bucket(videoBucket)
                .key(storageKey);

        String normalizedRange = normalizeRangeHeader(rangeHeader);
        if (normalizedRange != null) {
            request.range(normalizedRange);
        }

        ResponseBytes<GetObjectResponse> response = r2Client.getObjectAsBytes(request.build());
        byte[] bytes = response.asByteArray();
        GetObjectResponse metadata = response.response();
        return new ObjectBytes(
                bytes,
                bytes.length,
                metadata.contentType(),
                metadata.contentRange()
        );
    }

    public record ObjectBytes(byte[] bytes, long contentLength, String contentType, String contentRange) {}

    public void downloadToFile(String storageKey, Path destination) throws IOException {
        if (destination.getParent() != null) {
            Files.createDirectories(destination.getParent());
        }
        // The AWS SDK target path must not already exist when using Path-based downloads.
        Files.deleteIfExists(destination);
        r2Client.getObject(
                GetObjectRequest.builder()
                        .bucket(videoBucket)
                        .key(storageKey)
                        .build(),
                destination
        );
    }

    public String readUtf8(String storageKey) {
        try {
            ResponseBytes<GetObjectResponse> response = r2Client.getObjectAsBytes(GetObjectRequest.builder()
                    .bucket(videoBucket)
                    .key(storageKey)
                    .build());
            return response.asString(StandardCharsets.UTF_8);
        } catch (NoSuchKeyException e) {
            throw new com.example.lms.shared.exception.EntityNotFoundException("VideoManifest", storageKey);
        }
    }

    public String presignGet(String storageKey, Duration ttl) {
        GetObjectPresignRequest request = GetObjectPresignRequest.builder()
                .signatureDuration(ttl)
                .getObjectRequest(GetObjectRequest.builder()
                        .bucket(videoBucket)
                        .key(storageKey)
                        .build())
                .build();
        return r2Presigner.presignGetObject(request).url().toString();
    }

    public String presignPut(String storageKey, String contentType, long contentLength, Duration ttl) {
        PutObjectPresignRequest request = PutObjectPresignRequest.builder()
                .signatureDuration(ttl)
                .putObjectRequest(PutObjectRequest.builder()
                        .bucket(videoBucket)
                        .key(storageKey)
                        .contentType(contentType)
                        .contentLength(contentLength)
                        .build())
                .build();
        return r2Presigner.presignPutObject(request).url().toString();
    }

    public MultipartUploadSession initiateMultipartUpload(String storageKey, String contentType) {
        CreateMultipartUploadResponse response = r2Client.createMultipartUpload(
                CreateMultipartUploadRequest.builder()
                        .bucket(videoBucket)
                        .key(storageKey)
                        .contentType(contentType)
                        .build()
        );
        return new MultipartUploadSession(storageKey, response.uploadId());
    }

    public String presignUploadPart(String storageKey, String uploadId, int partNumber, Duration ttl) {
        UploadPartPresignRequest request = UploadPartPresignRequest.builder()
                .signatureDuration(ttl)
                .uploadPartRequest(UploadPartRequest.builder()
                        .bucket(videoBucket)
                        .key(storageKey)
                        .uploadId(uploadId)
                        .partNumber(partNumber)
                        .build())
                .build();
        return r2Presigner.presignUploadPart(request).url().toString();
    }

    private String normalizeRangeHeader(String rangeHeader) {
        if (rangeHeader == null || rangeHeader.isBlank()) {
            return null;
        }
        String value = rangeHeader.trim();
        if (!value.startsWith("bytes=") || value.contains(",")) {
            return null;
        }
        String spec = value.substring("bytes=".length());
        return spec.matches("(\\d+-\\d*|-\\d+)") ? value : null;
    }

    public void completeMultipartUpload(String storageKey, String uploadId, List<CompletedUploadPart> parts) {
        List<CompletedPart> completedParts = parts.stream()
                .sorted(Comparator.comparingInt(CompletedUploadPart::partNumber))
                .map(part -> CompletedPart.builder()
                        .partNumber(part.partNumber())
                        .eTag(normalizeEtag(part.eTag()))
                        .build())
                .toList();

        r2Client.completeMultipartUpload(
                CompleteMultipartUploadRequest.builder()
                        .bucket(videoBucket)
                        .key(storageKey)
                        .uploadId(uploadId)
                        .multipartUpload(CompletedMultipartUpload.builder()
                                .parts(completedParts)
                                .build())
                        .build()
        );
    }

    public void abortMultipartUpload(String storageKey, String uploadId) {
        if (storageKey == null || storageKey.isBlank() || uploadId == null || uploadId.isBlank()) {
            return;
        }
        r2Client.abortMultipartUpload(
                AbortMultipartUploadRequest.builder()
                        .bucket(videoBucket)
                        .key(storageKey)
                        .uploadId(uploadId)
                        .build()
        );
    }

    public void delete(String storageKey) {
        r2Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(videoBucket)
                .key(storageKey)
                .build());
    }

    public int deleteByPrefix(String prefix) {
        if (prefix == null || prefix.isBlank()) {
            return 0;
        }

        int deleted = 0;
        String continuationToken = null;
        do {
            var listResponse = r2Client.listObjectsV2(ListObjectsV2Request.builder()
                    .bucket(videoBucket)
                    .prefix(prefix)
                    .continuationToken(continuationToken)
                    .build());

            List<ObjectIdentifier> objects = listResponse.contents().stream()
                    .map(object -> ObjectIdentifier.builder().key(object.key()).build())
                    .toList();

            if (!objects.isEmpty()) {
                r2Client.deleteObjects(DeleteObjectsRequest.builder()
                        .bucket(videoBucket)
                        .delete(delete -> delete.objects(objects))
                        .build());
                deleted += objects.size();
            }

            continuationToken = listResponse.nextContinuationToken();
        } while (continuationToken != null && !continuationToken.isBlank());

        return deleted;
    }

    public String resolveInternalUrl(String storageKey) {
        return "video-private://" + storageKey;
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
        return filename.substring(filename.lastIndexOf('.')).toLowerCase();
    }

    private String normalizeEtag(String value) {
        if (value == null) {
            return "";
        }
        String normalized = value.trim();
        if (normalized.startsWith("\"") && normalized.endsWith("\"") && normalized.length() >= 2) {
            return normalized.substring(1, normalized.length() - 1);
        }
        return normalized;
    }

    public record UploadResult(
            String fileId,
            String storageKey,
            String internalUrl,
            long fileSize
    ) {}

    public record MultipartUploadSession(
            String storageKey,
            String uploadId
    ) {}

    public record CompletedUploadPart(
            int partNumber,
            String eTag
    ) {}
}

package com.example.lms.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;

import java.net.URI;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Service
@ConditionalOnProperty(prefix = "app.r2", name = "enabled", havingValue = "true")
@ConditionalOnBean({S3Client.class, S3Presigner.class})
@RequiredArgsConstructor
public class R2StorageService {

    private final S3Client s3Client;
    private final S3Presigner presigner;

    @Value("${app.r2.bucket:}")
    private String bucket;

    @Value("${app.r2.public-base-url:}")
    private String publicBaseUrl; // e.g., https://<your-public-bucket>.r2.dev or custom domain

    @Value("${app.r2.presign-ttl-seconds:900}")
    private int presignTtlSeconds;

    public Map<String, Object> generatePresignedUpload(String objectKey, String contentType) {
        if (bucket == null || bucket.isBlank()) {
            throw new IllegalStateException("R2 bucket not configured (app.r2.bucket)");
        }

        PutObjectRequest objectRequest = PutObjectRequest.builder()
                .bucket(bucket)
                .key(objectKey)
                .contentType(contentType)
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofSeconds(presignTtlSeconds))
                .putObjectRequest(objectRequest)
                .build();

        var presigned = presigner.presignPutObject(presignRequest);

        Map<String, Object> result = new HashMap<>();
        result.put("uploadUrl", presigned.url().toString());
        result.put("headers", presigned.signedHeaders());
        result.put("objectKey", objectKey);

        if (publicBaseUrl != null && !publicBaseUrl.isBlank()) {
            String publicUrl = publicBaseUrl.endsWith("/")
                    ? publicBaseUrl + objectKey
                    : publicBaseUrl + "/" + objectKey;
            result.put("publicUrl", publicUrl);
        }

        return result;
    }

    public boolean objectExists(String objectKey) {
        try {
            s3Client.headObject(HeadObjectRequest.builder().bucket(bucket).key(objectKey).build());
            return true;
        } catch (SdkClientException ex) {
            return false;
        }
    }

    public Map<String, Object> generatePresignedDownload(String objectKey) {
        if (bucket == null || bucket.isBlank()) {
            throw new IllegalStateException("R2 bucket not configured (app.r2.bucket)");
        }

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucket)
                .key(objectKey)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofSeconds(presignTtlSeconds))
                .getObjectRequest(getObjectRequest)
                .build();

        var presigned = presigner.presignGetObject(presignRequest);

        Map<String, Object> result = new HashMap<>();
        result.put("downloadUrl", presigned.url().toString());
        result.put("headers", presigned.signedHeaders());
        result.put("objectKey", objectKey);

        if (publicBaseUrl != null && !publicBaseUrl.isBlank()) {
            String publicUrl = publicBaseUrl.endsWith("/")
                    ? publicBaseUrl + objectKey
                    : publicBaseUrl + "/" + objectKey;
            result.put("publicUrl", publicUrl);
        }

        return result;
    }

    public boolean deleteObject(String objectKey) {
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(objectKey).build());
            return true;
        } catch (SdkClientException ex) {
            return false;
        }
    }

    public String buildPublicUrl(String objectKey) {
        if (publicBaseUrl == null || publicBaseUrl.isBlank()) {
            return null;
        }
        return publicBaseUrl.endsWith("/") ? publicBaseUrl + objectKey : publicBaseUrl + "/" + objectKey;
    }
}

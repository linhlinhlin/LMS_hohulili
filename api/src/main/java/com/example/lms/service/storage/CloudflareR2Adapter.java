package com.example.lms.service.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.IOException;
import java.net.URI;
import java.time.Duration;
import java.util.UUID;

// Uncomment @Service when ready to switch
// @Service("r2Provider")
public class CloudflareR2Adapter implements FileStorageProvider {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final String bucketName;

    public CloudflareR2Adapter(
            @Value("${cloudflare.r2.access-key}") String accessKey,
            @Value("${cloudflare.r2.secret-key}") String secretKey,
            @Value("${cloudflare.r2.endpoint}") String endpoint,
            @Value("${cloudflare.r2.bucket}") String bucketName) {
        
        this.bucketName = bucketName;
        
        AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKey, secretKey);
        
        this.s3Client = S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .region(Region.US_EAST_1) // R2 ignores region but S3 SDK needs one
                .build();
                
        this.s3Presigner = S3Presigner.builder()
                .endpointOverride(URI.create(endpoint))
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .region(Region.US_EAST_1)
                .build();
    }

    @Override
    public Object resolveFile(String storageKey) {
        // Generate Presigned URL for 302 Redirect
        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(60)) // Link valid for 60 mins
                .getObjectRequest(b -> b.bucket(bucketName).key(storageKey))
                .build();

        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }

    @Override
    public String uploadFile(MultipartFile file, String path) throws IOException {
        String key = path + "/" + UUID.randomUUID() + "_" + file.getOriginalFilename();
        
        s3Client.putObject(PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(file.getContentType())
                .build(), 
                software.amazon.awssdk.core.sync.RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
                
        return key;
    }

    @Override
    public void deleteFile(String storageKey) {
        s3Client.deleteObject(b -> b.bucket(bucketName).key(storageKey));
    }

    @Override
    public String getProviderName() {
        return "CLOUDFLARE_R2";
    }
}

package com.example.lms.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URI;

/**
 * Cloudflare R2 Configuration
 * R2 is S3-compatible, so we use AWS SDK with custom endpoint.
 *
 * This configuration is conditional and only activates when cloudflare.r2.enabled=true
 */
@Configuration
@ConditionalOnProperty(name = "cloudflare.r2.enabled", havingValue = "true", matchIfMissing = false)
public class R2Config {

    @Value("${cloudflare.r2.account-id}")
    private String accountId;

    @Value("${cloudflare.r2.access-key}")
    private String accessKey;

    @Value("${cloudflare.r2.secret-key}")
    private String secretKey;

    @Value("${cloudflare.r2.endpoint:}")
    private String endpointOverride;

    @Value("${cloudflare.r2.region:auto}")
    private String region;

    @Value("${cloudflare.r2.path-style-access:true}")
    private boolean pathStyleAccess;

    @Bean
    public S3Client r2Client() {
        return S3Client.builder()
                .endpointOverride(resolveEndpoint())
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)))
                .region(Region.of(resolveRegion()))
                .forcePathStyle(pathStyleAccess)
                .build();
    }

    @Bean
    public S3Presigner r2Presigner() {
        return S3Presigner.builder()
                .endpointOverride(resolveEndpoint())
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)))
                .region(Region.of(resolveRegion()))
                .build();
    }

    @Bean
    public URI r2EndpointUri() {
        return resolveEndpoint();
    }

    private URI resolveEndpoint() {
        if (endpointOverride != null && !endpointOverride.isBlank()) {
            return URI.create(endpointOverride.trim());
        }
        return URI.create("https://" + accountId + ".r2.cloudflarestorage.com");
    }

    private String resolveRegion() {
        return region == null || region.isBlank() ? "auto" : region.trim();
    }
}

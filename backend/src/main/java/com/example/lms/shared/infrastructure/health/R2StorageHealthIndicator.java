package com.example.lms.shared.infrastructure.health;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;

import java.time.Duration;
import java.time.Instant;

/**
 * Spring Boot HealthIndicator that verifies R2 bucket reachability.
 *
 * Pings both buckets (cdn + storage) via {@code HeadBucket} which exercises:
 *   1. Network reachability to the R2 endpoint
 *   2. Credential validity (Access Key + Secret)
 *   3. Bucket existence + IAM scope
 *
 * Exposed at {@code /actuator/health} (production) or {@code /actuator/health/r2Storage}.
 *
 * Cached for 60 seconds to avoid hitting R2 on every health probe — Kubernetes/load
 * balancer typically polls every 5-30s, but we accept up to a minute of staleness in
 * exchange for not racking up Class B operations.
 *
 * Only registered when {@code cloudflare.r2.enabled=true}; on dev profiles the
 * indicator is absent and {@code /actuator/health} reports without an R2 entry.
 */
@Component("r2Storage")
@ConditionalOnProperty(name = "cloudflare.r2.enabled", havingValue = "true")
public class R2StorageHealthIndicator implements HealthIndicator {

    private static final Duration CACHE_TTL = Duration.ofSeconds(60);

    private final S3Client r2Client;
    private final String publicBucket;
    private final String videoBucket;

    private volatile Health cached;
    private volatile Instant cachedAt;

    @Autowired
    public R2StorageHealthIndicator(
            S3Client r2Client,
            @Value("${cloudflare.r2.bucket}") String publicBucket,
            @Value("${cloudflare.r2.video-bucket}") String videoBucket) {
        this.r2Client = r2Client;
        this.publicBucket = publicBucket;
        this.videoBucket = videoBucket;
    }

    @Override
    public Health health() {
        Health snapshot = cached;
        if (snapshot != null && cachedAt != null && Duration.between(cachedAt, Instant.now()).compareTo(CACHE_TTL) < 0) {
            return snapshot;
        }

        Health.Builder builder = Health.up();
        boolean publicOk = headBucket(builder, "publicBucket", publicBucket);
        boolean videoOk = headBucket(builder, "videoBucket", videoBucket);

        if (!publicOk || !videoOk) {
            builder = Health.down()
                    .withDetail("publicBucketName", publicBucket)
                    .withDetail("videoBucketName", videoBucket);
            // Re-add the per-bucket result keys so observers see which one failed.
            builder.withDetail("publicBucketReachable", publicOk);
            builder.withDetail("videoBucketReachable", videoOk);
        } else {
            builder.withDetail("publicBucket", publicBucket)
                    .withDetail("videoBucket", videoBucket);
        }
        builder.withDetail("checkedAt", Instant.now().toString());

        Health result = builder.build();
        cached = result;
        cachedAt = Instant.now();
        return result;
    }

    private boolean headBucket(Health.Builder builder, String key, String bucketName) {
        try {
            r2Client.headBucket(HeadBucketRequest.builder().bucket(bucketName).build());
            return true;
        } catch (Exception ex) {
            builder.withDetail(key + "Error", ex.getClass().getSimpleName() + ": " + ex.getMessage());
            return false;
        }
    }
}

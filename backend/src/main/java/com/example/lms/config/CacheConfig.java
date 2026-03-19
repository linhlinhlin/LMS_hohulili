package com.example.lms.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;

import java.util.concurrent.TimeUnit;

/**
 * Caffeine Cache Configuration with per-cache TTL differentiation.
 *
 * <ul>
 *   <li>{@code categories} — 1 hour (rarely changes)</li>
 *   <li>{@code instructors} — 10 min (moderate changes)</li>
 *   <li>{@code courses}, {@code courseContent} — 5 min (frequently updated)</li>
 *   <li>{@code studentEnrollments}, {@code studentProgress} — 2 min (user-specific, freshness matters)</li>
 * </ul>
 */
@Configuration
@EnableCaching
public class CacheConfig {

    @Value("${app.video.manifest-cache-seconds:60}")
    private long videoManifestCacheSeconds;

    @Value("${app.video.object-redirect-cache-seconds:30}")
    private long videoObjectRedirectCacheSeconds;

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();

        // Default for any unlisted cache: 5 min, 500 entries
        cacheManager.setCaffeine(Caffeine.newBuilder()
            .expireAfterWrite(5, TimeUnit.MINUTES)
            .maximumSize(500)
            .recordStats()
        );

        // Per-cache configuration with differentiated TTLs
        cacheManager.registerCustomCache("categories",
            Caffeine.newBuilder().expireAfterWrite(1, TimeUnit.HOURS).maximumSize(200).recordStats().build());
        cacheManager.registerCustomCache("instructors",
            Caffeine.newBuilder().expireAfterWrite(10, TimeUnit.MINUTES).maximumSize(500).recordStats().build());
        cacheManager.registerCustomCache("courses",
            Caffeine.newBuilder().expireAfterWrite(5, TimeUnit.MINUTES).maximumSize(1000).recordStats().build());
        cacheManager.registerCustomCache("courseContent",
            Caffeine.newBuilder().expireAfterWrite(5, TimeUnit.MINUTES).maximumSize(1000).recordStats().build());
        cacheManager.registerCustomCache("studentEnrollments",
            Caffeine.newBuilder().expireAfterWrite(2, TimeUnit.MINUTES).maximumSize(2000).recordStats().build());
        cacheManager.registerCustomCache("studentProgress",
            Caffeine.newBuilder().expireAfterWrite(2, TimeUnit.MINUTES).maximumSize(2000).recordStats().build());
        cacheManager.registerCustomCache("videoPlaybackManifests",
            Caffeine.newBuilder()
                .expireAfterWrite(Math.max(10, videoManifestCacheSeconds), TimeUnit.SECONDS)
                .maximumSize(1000)
                .recordStats()
                .build());
        cacheManager.registerCustomCache("videoPlaybackObjectRedirects",
            Caffeine.newBuilder()
                .expireAfterWrite(Math.max(10, videoObjectRedirectCacheSeconds), TimeUnit.SECONDS)
                .maximumSize(10000)
                .recordStats()
                .build());

        return cacheManager;
    }
}

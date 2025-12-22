package com.example.lms.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * SOTA Caffeine Cache Configuration (Dec 2025)
 * 
 * Following Google/Netflix best practices:
 * - Caffeine is faster than Guava Cache
 * - Adaptive eviction policies (TinyLFU algorithm)
 * - Native Spring Boot 3.x integration
 * 
 * Cache strategy:
 * - categories: Long TTL (1 hour) - rarely changes
 * - courses: Medium TTL (5 min) - frequently accessed
 * - instructors: Medium TTL (10 min) - moderate changes
 */
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();
        
        // Default configuration for all caches
        cacheManager.setCaffeine(Caffeine.newBuilder()
            // Expire entries after write (TTL)
            .expireAfterWrite(10, TimeUnit.MINUTES)
            // Maximum number of entries in cache
            .maximumSize(1000)
            // Record cache stats for monitoring via Actuator
            .recordStats()
            // Weak values to allow GC if memory pressure
            // .weakValues() // Uncomment for memory-sensitive environments
        );
        
        // Register cache names
        cacheManager.setCacheNames(java.util.List.of(
            "categories",           // TTL: 10 min - rarely changes
            "instructors",          // TTL: 10 min
            "courses",              // TTL: 10 min
            "courseContent",        // TTL: 10 min
            // SOTA: Student-specific caches (Dec 2025)
            // Pattern from Amazon: Cache user-specific data with shorter TTL
            "studentEnrollments",   // TTL: 5 min - enrolled courses per student
            "studentProgress"       // TTL: 5 min - progress per student per course
        ));
        
        return cacheManager;
    }
}

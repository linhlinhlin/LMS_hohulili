package com.example.lms.learning_delivery.infrastructure.service;

import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.Duration;

@Service
@RequiredArgsConstructor
public class AdaptiveVideoPlaybackCacheService {

    private final VideoBinaryStorageService videoBinaryStorageService;

    @Cacheable(cacheNames = "videoPlaybackManifests", key = "#storageKey", sync = true)
    public String readManifest(String storageKey) {
        try {
            return videoBinaryStorageService.readUtf8(storageKey);
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }

    @Cacheable(
            cacheNames = "videoPlaybackObjectRedirects",
            key = "#storageKey + ':' + #ttl.seconds",
            sync = true
    )
    public String createObjectRedirect(String storageKey, Duration ttl) {
        return videoBinaryStorageService.createReadUrl(storageKey, ttl);
    }
}

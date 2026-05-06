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

    /**
     * Probe object metadata (size + content-type) without transferring body.
     * Not cached — HEAD response varies per request and is cheap on R2.
     */
    public com.example.lms.shared.infrastructure.service.R2VideoStorageService.ObjectMetadata
            headObject(String storageKey) throws IOException {
        return videoBinaryStorageService.head(storageKey);
    }

    public com.example.lms.shared.infrastructure.service.R2VideoStorageService.ObjectBytes
            readObject(String storageKey, String rangeHeader) throws IOException {
        return videoBinaryStorageService.readObject(storageKey, rangeHeader);
    }
}

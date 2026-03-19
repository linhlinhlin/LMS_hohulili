package com.example.lms.learning_delivery.infrastructure.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.video.ingest.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class VideoAssetIngestScheduler {

    private final VideoAssetIngestService videoAssetIngestService;

    @EventListener(ApplicationReadyEvent.class)
    public void logSchedulerReady() {
        log.info("[VideoAsset] Ingest scheduler ready (fixedDelay=15000ms)");
    }

    @Scheduled(fixedDelay = 15000)
    public void processPendingVideoAssets() {
        try {
            int processed = videoAssetIngestService.processRunnableJobs(2);
            if (processed > 0) {
                log.info("[VideoAsset] Scheduler processed {} pending ingest job(s)", processed);
            }
        } catch (Exception ex) {
            log.error("[VideoAsset] Scheduler sweep failed", ex);
        }
    }
}

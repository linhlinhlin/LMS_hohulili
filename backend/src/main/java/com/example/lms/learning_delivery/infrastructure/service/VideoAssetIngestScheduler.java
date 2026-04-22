package com.example.lms.learning_delivery.infrastructure.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ConditionalOnProperty(name = "app.video.ingest.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class VideoAssetIngestScheduler {

    private final VideoAssetIngestService videoAssetIngestService;

    @EventListener(ApplicationReadyEvent.class)
    public void logSchedulerReady() {
        log.info("[VideoAsset] Ingest scheduler ready (fixedDelay=15000ms)");
        verifyExternalTools();
    }

    private void verifyExternalTools() {
        verifyTool("ffprobe", List.of("ffprobe", "-version"), "ffprobe");
        verifyTool("ffmpeg", List.of("ffmpeg", "-version"), "ffmpeg");
        verifyTool("packager", List.of("packager", "--version"), "Shaka Packager");

        try {
            Process process = new ProcessBuilder("ffmpeg", "-hide_banner", "-encoders")
                    .redirectErrorStream(true).start();
            String output = new String(process.getInputStream().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
            process.waitFor(5, java.util.concurrent.TimeUnit.SECONDS);
            boolean hasH264 = output.contains("libx264");
            boolean hasAac = output.contains("aac");
            log.info("[VideoAsset] ffmpeg codecs: libx264={}, aac={}", hasH264 ? "YES" : "MISSING", hasAac ? "YES" : "MISSING");
            if (!hasH264) {
                log.error("[VideoAsset] CRITICAL: ffmpeg is missing libx264 encoder — video transcoding will fail");
            }
        } catch (Exception ex) {
            log.warn("[VideoAsset] Could not verify ffmpeg codecs: {}", ex.getMessage());
        }
    }

    private void verifyTool(String command, java.util.List<String> args, String displayName) {
        try {
            Process process = new ProcessBuilder(args).redirectErrorStream(true).start();
            String output = new String(process.getInputStream().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
            boolean finished = process.waitFor(5, java.util.concurrent.TimeUnit.SECONDS);
            if (!finished || process.exitValue() != 0) {
                log.error("[VideoAsset] {} check failed (exit={}): {}", displayName, finished ? process.exitValue() : "timeout", output.substring(0, Math.min(200, output.length())));
            } else {
                String firstLine = output.lines().findFirst().orElse("").trim();
                log.info("[VideoAsset] {} available: {}", displayName, firstLine.substring(0, Math.min(100, firstLine.length())));
            }
        } catch (Exception ex) {
            log.error("[VideoAsset] {} not found on PATH: {}", displayName, ex.getMessage());
        }
    }

    @Scheduled(fixedDelay = 15000)
    public void processPendingVideoAssets() {
        try {
            int processed = videoAssetIngestService.processRunnableJobs(2);
            if (processed > 0) {
                log.info("[VideoAsset] Scheduler processed {} ingest job(s)", processed);
            }
        } catch (Exception ex) {
            log.error("[VideoAsset] Scheduler sweep failed: {}", ex.getMessage(), ex);
        }
    }
}

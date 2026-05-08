package com.example.lms.learning_delivery.infrastructure.service;

import com.example.lms.learning_delivery.infrastructure.persistence.entity.VideoAssetJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.VideoIngestJobJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.VideoRenditionJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.repository.VideoAssetJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.repository.VideoIngestJobClaimRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.repository.VideoIngestJobJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.repository.VideoRenditionJpaRepository;
import com.example.lms.shared.infrastructure.persistence.entity.FileAttachmentJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.FileAttachmentJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StopWatch;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class VideoAssetIngestService {

    private final VideoAssetJpaRepository videoAssetRepository;
    private final VideoIngestJobJpaRepository videoIngestJobRepository;
    private final VideoIngestJobClaimRepository videoIngestJobClaimRepository;
    private final VideoRenditionJpaRepository videoRenditionRepository;
    private final FileAttachmentJpaRepository fileAttachmentRepository;
    private final VideoBinaryStorageService videoBinaryStorageService;
    private final FfmpegVideoProcessingService ffmpegVideoProcessingService;
    private final ShakaPackagerService shakaPackagerService;
    private final ApplicationContext applicationContext;

    @Value("${app.video.package-upload-concurrency:6}")
    private int packageUploadConcurrency;

    public int processRunnableJobs(int maxJobs) {
        List<UUID> claimedJobIds = videoIngestJobClaimRepository.claimRunnableJobIds(Instant.now(), maxJobs);

        int processed = 0;
        VideoAssetIngestService proxiedSelf = applicationContext.getBean(VideoAssetIngestService.class);
        for (UUID jobId : claimedJobIds) {
            proxiedSelf.processSingleJob(jobId);
            processed++;
        }
        return processed;
    }

    public void processSingleJob(UUID jobId) {
        VideoIngestJobJpaEntity job = videoIngestJobRepository.findById(jobId).orElse(null);
        if (job == null) {
            return;
        }

        VideoAssetJpaEntity asset = videoAssetRepository.findById(job.getVideoAssetId()).orElse(null);
        if (asset == null) {
            log.warn("[VideoAsset] Skipping ingest job {} because asset {} no longer exists",
                    job.getId(), job.getVideoAssetId());
            return;
        }

        FileAttachmentJpaEntity sourceAttachment = fileAttachmentRepository.findById(asset.getSourceAttachmentId())
                .orElse(null);
        if (sourceAttachment == null) {
            markJobFailed(job, asset, "Source attachment no longer exists", false);
            return;
        }

        if (!"PROCESSING".equalsIgnoreCase(job.getStatus())) {
            job.setStatus("PROCESSING");
            job.setStartedAt(Instant.now());
            job.setLastError(null);
            videoIngestJobRepository.save(job);
        }

        asset.setStatus("PROCESSING");
        asset.setAdaptivePackagingStatus("PROCESSING");
        asset.setProcessingStartedAt(Instant.now());
        asset.setErrorMessage(null);
        asset.setAdaptiveErrorMessage(null);
        asset.setPlaybackUrl(null);
        asset.setStreamVideoUid(null);
        videoAssetRepository.save(asset);

        log.info("[VideoAsset] Starting ingest: assetId={}, sourceKey={}, size={}, contentType={}",
                asset.getId(), asset.getSourceStorageKey(), asset.getSourceFileSize(), asset.getContentType());

        Path sourceTemp = null;
        Path packageOutputDir = null;
        List<Path> generatedFiles = new ArrayList<>();
        StopWatch stopWatch = new StopWatch("video-asset-" + asset.getId());

        try {
            VideoBinaryStorageService.SourceBinary sourceBinary = runTimed(
                    stopWatch,
                    "materialize-source",
                    () -> videoBinaryStorageService.materializeSource(sourceAttachment, asset.getId())
            );
            sourceTemp = sourceBinary.path();
            Path materializedSource = sourceTemp;
            FfmpegVideoProcessingService.VideoProbe probe = runTimed(
                    stopWatch,
                    "probe-source",
                    () -> ffmpegVideoProcessingService.probe(materializedSource)
            );
            if (abortIfAssetDeleted(asset.getId(), "probe-source")) {
                return;
            }

            asset.setWidth(probe.width());
            asset.setHeight(probe.height());
            asset.setDurationSeconds(probe.durationSeconds());

            renditionReset(asset.getId());
            if (abortIfAssetDeleted(asset.getId(), "reset-renditions")) {
                return;
            }
            createOriginalRendition(asset, sourceAttachment, probe);

            List<RenditionSpec> renditionSpecs = buildRenditionSpecs(sourceAttachment, probe);
            Map<String, FfmpegVideoProcessingService.TranscodedRendition> transcodedRenditions = runTimed(
                    stopWatch,
                    "transcode-adaptive-renditions",
                    () -> ffmpegVideoProcessingService.transcodeMp4Renditions(
                            materializedSource,
                            asset.getId(),
                            renditionSpecs.stream()
                                    .filter(spec -> !spec.reuseOriginalSource())
                                    .map(spec -> new FfmpegVideoProcessingService.TranscodeRequest(spec.profile(), spec.targetHeight()))
                                    .toList(),
                            probe.hasAudio(),
                            probe.frameRate()
                    )
            ).stream().collect(Collectors.toMap(
                    FfmpegVideoProcessingService.TranscodedRendition::profile,
                    rendition -> rendition
            ));
            generatedFiles.addAll(transcodedRenditions.values().stream()
                    .map(FfmpegVideoProcessingService.TranscodedRendition::outputPath)
                    .toList());
            if (abortIfAssetDeleted(asset.getId(), "transcode-adaptive-renditions")) {
                return;
            }

            List<ShakaPackagerService.PackagerInput> adaptiveInputs = new ArrayList<>();
            for (RenditionSpec spec : renditionSpecs) {
                Path packageSourcePath = sourceTemp;
                long fileSize = sourceAttachment.getFileSize() != null ? sourceAttachment.getFileSize() : 0L;
                String storageKey = asset.getSourceStorageKey();
                String fileUrl = asset.getSourceFileUrl();

                if (!spec.reuseOriginalSource()) {
                    FfmpegVideoProcessingService.TranscodedRendition transcodedRendition = transcodedRenditions.get(spec.profile());
                    if (transcodedRendition == null) {
                        throw new IOException("Missing generated rendition for profile " + spec.profile());
                    }
                    Path generated = transcodedRendition.outputPath();

                    storageKey = "video-renditions/" + asset.getId() + "/" + spec.profile().toLowerCase() + "-" + spec.actualResolution() + ".mp4";
                    String renditionStorageKey = storageKey;
                    VideoBinaryStorageService.StoredBinary stored = runTimed(
                            stopWatch,
                            "upload-rendition-" + spec.profile().toLowerCase(),
                            () -> videoBinaryStorageService.storeGenerated(generated, renditionStorageKey, "video/mp4")
                    );
                    packageSourcePath = generated;
                    fileSize = stored.fileSize();
                    fileUrl = stored.fileUrl();
                }

                if (abortIfAssetDeleted(asset.getId(), "save-rendition-" + spec.profile().toLowerCase())) {
                    return;
                }
                videoRenditionRepository.save(VideoRenditionJpaEntity.builder()
                        .videoAssetId(asset.getId())
                        .playbackKind("FILE_MP4")
                        .profile(spec.profile())
                        .actualResolution(spec.actualResolution())
                        .fileSizeBytes(fileSize)
                        .storageKey(storageKey)
                        .fileUrl(fileUrl)
                        .status("READY")
                        .build());

                adaptiveInputs.add(new ShakaPackagerService.PackagerInput(
                        spec.profile(),
                        spec.actualResolution(),
                        spec.targetHeight(),
                        packageSourcePath,
                        probe.hasAudio()
                ));
            }

            AdaptivePackageMetadata packageMetadata = packageAdaptive(asset.getId(), adaptiveInputs, stopWatch);
            packageOutputDir = packageMetadata.localOutputDir();
            if (abortIfAssetDeleted(asset.getId(), "package-adaptive")) {
                return;
            }

            asset.setHlsManifestStorageKey(packageMetadata.hlsManifestStorageKey());
            asset.setDashManifestStorageKey(packageMetadata.dashManifestStorageKey());
            asset.setAdaptivePackagingStatus("READY");
            asset.setAdaptivePackagedAt(Instant.now());
            asset.setAdaptiveErrorMessage(null);
            asset.setStatus("READY");
            asset.setProcessedAt(Instant.now());
            asset.setErrorMessage(null);
            videoAssetRepository.save(asset);

            job.setStatus("COMPLETED");
            job.setFinishedAt(Instant.now());
            job.setLastError(null);
            videoIngestJobRepository.save(job);

            log.info("[VideoAsset] Ingest completed: assetId={}, hlsKey={}, dashKey={}",
                    asset.getId(), asset.getHlsManifestStorageKey(), asset.getDashManifestStorageKey());
            log.info("[VideoAsset] Ingest timings: assetId={}, totalMs={}, stages={}",
                    asset.getId(),
                    stopWatch.getTotalTimeMillis(),
                    summarizeStopWatch(stopWatch));
        } catch (Exception ex) {
            log.error("[VideoAsset] Ingest failed: assetId={}, error={}", asset.getId(), ex.getMessage(), ex);
            if (stopWatch.getTaskCount() > 0) {
                log.warn("[VideoAsset] Partial ingest timings before failure: assetId={}, totalMs={}, stages={}",
                        asset.getId(),
                        stopWatch.getTotalTimeMillis(),
                        summarizeStopWatch(stopWatch));
            }
            if (!videoAssetRepository.existsById(asset.getId())) {
                log.warn("[VideoAsset] Asset {} disappeared before failure state could be saved", asset.getId());
                return;
            }
            markJobFailed(job, asset, ex.getMessage(), shouldRetry(job, ex));
        } finally {
            deleteQuietly(sourceTemp);
            generatedFiles.forEach(this::deleteQuietly);
            deleteDirectoryQuietly(packageOutputDir);
        }
    }

    private boolean abortIfAssetDeleted(UUID assetId, String stage) {
        if (videoAssetRepository.existsById(assetId)) {
            return false;
        }
        log.warn("[VideoAsset] Aborting ingest at stage {} because asset {} no longer exists", stage, assetId);
        return true;
    }

    private AdaptivePackageMetadata packageAdaptive(
            UUID assetId,
            List<ShakaPackagerService.PackagerInput> adaptiveInputs,
            StopWatch stopWatch
    )
            throws IOException, InterruptedException {
        ShakaPackagerService.PackageOutput packageOutput = runTimed(
                stopWatch,
                "package-adaptive-local",
                () -> shakaPackagerService.packageAdaptive(assetId, adaptiveInputs)
        );
        String storagePrefix = "video-packages/" + assetId + "/";
        runTimed(
                stopWatch,
                "upload-adaptive-package",
                () -> {
                    uploadPackagedFiles(storagePrefix, packageOutput.files());
                    return packageOutput;
                }
        );

        return new AdaptivePackageMetadata(
                storagePrefix + packageOutput.hlsManifestRelativePath(),
                storagePrefix + packageOutput.dashManifestRelativePath(),
                packageOutput.outputDirectory()
        );
    }

    private void uploadPackagedFiles(String storagePrefix, List<ShakaPackagerService.PackagedFile> packagedFiles) throws IOException, InterruptedException {
        if (packagedFiles == null || packagedFiles.isEmpty()) {
            return;
        }

        int concurrency = Math.max(1, Math.min(packageUploadConcurrency, packagedFiles.size()));
        if (concurrency == 1) {
            for (ShakaPackagerService.PackagedFile packagedFile : packagedFiles) {
                uploadSinglePackagedFile(storagePrefix, packagedFile);
            }
            return;
        }

        ExecutorService executor = Executors.newFixedThreadPool(concurrency);
        List<Future<Void>> futures = new ArrayList<>();
        try {
            for (ShakaPackagerService.PackagedFile packagedFile : packagedFiles) {
                futures.add(executor.submit(() -> {
                    uploadSinglePackagedFile(storagePrefix, packagedFile);
                    return null;
                }));
            }

            IOException ioFailure = null;
            InterruptedException interruptedFailure = null;
            for (Future<Void> future : futures) {
                try {
                    future.get();
                } catch (InterruptedException ex) {
                    interruptedFailure = ex;
                    break;
                } catch (ExecutionException ex) {
                    ioFailure = unwrapUploadFailure(ex);
                    break;
                }
            }

            if (interruptedFailure != null) {
                for (Future<Void> future : futures) {
                    future.cancel(true);
                }
                throw interruptedFailure;
            }
            if (ioFailure != null) {
                for (Future<Void> future : futures) {
                    future.cancel(true);
                }
                throw ioFailure;
            }
        } finally {
            executor.shutdownNow();
        }
    }

    private void uploadSinglePackagedFile(String storagePrefix, ShakaPackagerService.PackagedFile packagedFile) throws IOException {
        String storageKey = storagePrefix + packagedFile.relativePath();
        String contentType = contentTypeFor(packagedFile.relativePath());
        videoBinaryStorageService.storeGenerated(packagedFile.file(), storageKey, contentType);
    }

    private IOException unwrapUploadFailure(ExecutionException executionException) {
        Throwable cause = executionException.getCause();
        if (cause instanceof UncheckedIOException uncheckedIOException) {
            return uncheckedIOException.getCause();
        }
        if (cause instanceof IOException ioException) {
            return ioException;
        }
        if (cause instanceof RuntimeException runtimeException) {
            return new IOException(runtimeException.getMessage(), runtimeException);
        }
        return new IOException("Failed to upload packaged video assets", cause);
    }

    private <T> T runTimed(StopWatch stopWatch, String taskName, CheckedSupplier<T> action) throws IOException, InterruptedException {
        stopWatch.start(taskName);
        try {
            return action.get();
        } finally {
            stopWatch.stop();
        }
    }

    private String summarizeStopWatch(StopWatch stopWatch) {
        return java.util.Arrays.stream(stopWatch.getTaskInfo())
                .map(task -> task.getTaskName() + "=" + task.getTimeMillis() + "ms")
                .collect(Collectors.joining(", "));
    }

    private String contentTypeFor(String relativePath) {
        if (relativePath == null) {
            return "application/octet-stream";
        }
        if (relativePath.endsWith(".m3u8")) {
            return "application/vnd.apple.mpegurl";
        }
        if (relativePath.endsWith(".mpd")) {
            return "application/dash+xml";
        }
        if (relativePath.endsWith(".m4s")) {
            return "video/iso.segment";
        }
        if (relativePath.endsWith(".mp4")) {
            return "video/mp4";
        }
        return "application/octet-stream";
    }

    private void renditionReset(UUID assetId) {
        videoRenditionRepository.deleteByVideoAssetId(assetId);
    }

    private void createOriginalRendition(VideoAssetJpaEntity asset, FileAttachmentJpaEntity sourceAttachment, FfmpegVideoProcessingService.VideoProbe probe) {
        videoRenditionRepository.save(VideoRenditionJpaEntity.builder()
                .videoAssetId(asset.getId())
                .playbackKind("FILE_MP4")
                .profile("ORIGINAL")
                .actualResolution(probe.height() > 0 ? probe.height() + "p" : null)
                .fileSizeBytes(sourceAttachment.getFileSize())
                .storageKey(asset.getSourceStorageKey())
                .fileUrl(asset.getSourceFileUrl())
                .status("READY")
                .build());
    }

    private List<RenditionSpec> buildRenditionSpecs(
            FileAttachmentJpaEntity sourceAttachment,
            FfmpegVideoProcessingService.VideoProbe probe
    ) {
        List<RenditionSpec> specs = new ArrayList<>();
        int height = probe.height();
        if (height <= 0) {
            return specs;
        }

        int saverHeight = Math.min(height, 360);
        specs.add(new RenditionSpec("SAVER", saverHeight, saverHeight + "p", canReuseSource(sourceAttachment, height, saverHeight)));

        if (height >= 480) {
            int standardHeight = Math.min(height, 720);
            specs.add(new RenditionSpec("STANDARD", standardHeight, standardHeight + "p", canReuseSource(sourceAttachment, height, standardHeight)));
        }

        if (height >= 1080) {
            specs.add(new RenditionSpec("HIGH", 1080, "1080p", canReuseSource(sourceAttachment, height, 1080)));
        }

        return specs;
    }

    private boolean canReuseSource(FileAttachmentJpaEntity sourceAttachment, int sourceHeight, int targetHeight) {
        return sourceHeight == targetHeight
                && sourceAttachment.getContentType() != null
                && sourceAttachment.getContentType().equalsIgnoreCase("video/mp4");
    }

    private static final int MAX_RETRY_ATTEMPTS = 5;
    private static final long BASE_RETRY_DELAY_SECONDS = 60;
    private static final long MAX_RETRY_DELAY_SECONDS = 900; // 15 minutes cap

    private boolean shouldRetry(VideoIngestJobJpaEntity job, Exception ex) {
        int attempts = job.getAttemptCount() != null ? job.getAttemptCount() : 0;
        if (attempts >= MAX_RETRY_ATTEMPTS) {
            return false;
        }
        return isTransientError(ex);
    }

    private boolean isTransientError(Exception ex) {
        if (ex == null) {
            return true;
        }
        String msg = ex.getMessage() != null ? ex.getMessage().toLowerCase() : "";
        // Permanent: codec not found, unsupported format, corrupt file
        if (msg.contains("codec not found") || msg.contains("invalid data found")
                || msg.contains("unsupported codec") || msg.contains("no such file")
                || msg.contains("source attachment no longer exists")
                || msg.contains("not a video file") || msg.contains("moov atom not found")) {
            return false;
        }
        // Permanent: process exit with known fatal codes
        if (ex instanceof UncheckedIOException || msg.contains("exit code 1") && msg.contains("encoder")) {
            return false;
        }
        // Transient: I/O, timeout, disk space, OOM, network
        return true;
    }

    private void markJobFailed(VideoIngestJobJpaEntity job, VideoAssetJpaEntity asset, String error, boolean retryable) {
        int attempts = job.getAttemptCount() != null ? job.getAttemptCount() : 0;
        String truncatedError = error != null && error.length() > 2000 ? error.substring(0, 2000) : error;

        try {
            job.setStatus(retryable ? "RETRY" : "FAILED");
            job.setLastError(truncatedError);
            job.setFinishedAt(Instant.now());
            if (retryable) {
                long delaySec = Math.min(BASE_RETRY_DELAY_SECONDS * (1L << attempts), MAX_RETRY_DELAY_SECONDS);
                job.setNextRunAt(Instant.now().plusSeconds(delaySec));
                log.info("[VideoAsset] Job {} scheduled for retry #{} in {}s (exponential backoff)",
                        job.getId(), attempts + 1, delaySec);
            }
            videoIngestJobRepository.save(job);
        } catch (Exception jobSaveEx) {
            log.error("[VideoAsset] CRITICAL: Failed to save job failure state: jobId={}, error={}", job.getId(), jobSaveEx.getMessage());
        }

        try {
            asset.setStatus(retryable ? "PENDING" : "FAILED");
            asset.setAdaptivePackagingStatus(retryable ? "PENDING" : "FAILED");
            asset.setErrorMessage(truncatedError);
            asset.setAdaptiveErrorMessage(truncatedError);
            videoAssetRepository.save(asset);
        } catch (Exception assetSaveEx) {
            log.error("[VideoAsset] CRITICAL: Failed to save asset failure state: assetId={}, error={}", asset.getId(), assetSaveEx.getMessage());
        }
    }

    private void deleteQuietly(Path path) {
        if (path == null) {
            return;
        }
        try {
            Files.deleteIfExists(path);
        } catch (IOException ignored) {
            // best-effort temp cleanup
        }
    }

    private void deleteDirectoryQuietly(Path directory) {
        if (directory == null || !Files.exists(directory)) {
            return;
        }
        try (var walk = Files.walk(directory)) {
            walk.sorted(Comparator.reverseOrder()).forEach(this::deleteQuietly);
        } catch (IOException ignored) {
            // best-effort temp cleanup
        }
    }

    private record RenditionSpec(
            String profile,
            int targetHeight,
            String actualResolution,
            boolean reuseOriginalSource
    ) {}

    private record AdaptivePackageMetadata(
            String hlsManifestStorageKey,
            String dashManifestStorageKey,
            Path localOutputDir
    ) {}

    @FunctionalInterface
    private interface CheckedSupplier<T> {
        T get() throws IOException, InterruptedException;
    }
}

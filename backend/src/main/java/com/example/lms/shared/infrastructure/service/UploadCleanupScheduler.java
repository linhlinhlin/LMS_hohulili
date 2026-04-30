package com.example.lms.shared.infrastructure.service;

import com.example.lms.shared.infrastructure.persistence.entity.UploadSessionJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.FileAttachmentJpaRepository;
import com.example.lms.shared.infrastructure.persistence.repository.UploadSessionJpaRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Scheduled cleanup for expired upload sessions and orphaned file attachments.
 */
@Component
@Slf4j
public class UploadCleanupScheduler {

    private final UploadSessionJpaRepository sessionRepository;
    private final FileAttachmentJpaRepository fileAttachmentRepository;
    private final java.util.Optional<R2StorageService> r2StorageService;
    private final java.util.Optional<R2VideoStorageService> r2VideoStorageService;
    private final java.util.Optional<LocalStorageService> localStorageService;

    /**
     * Operations toggle for orphan attachment cleanup. Default true to preserve dev behaviour.
     * In production, set {@code APP_CLEANUP_ORPHAN_ATTACHMENTS_ENABLED=false} as a kill switch
     * if the cleanup query is suspected of deleting referenced files.
     */
    @Value("${app.cleanup.orphan-attachments.enabled:true}")
    private boolean orphanCleanupEnabled;

    /**
     * Retention window for orphan attachments before they are eligible for deletion.
     * Increased from the legacy 7 days to 30 days to give downstream entity-link flows
     * sufficient time to mark attachments as referenced.
     */
    @Value("${app.cleanup.orphan-attachments.retention-days:30}")
    private int orphanRetentionDays;

    @Autowired
    public UploadCleanupScheduler(
            UploadSessionJpaRepository sessionRepository,
            FileAttachmentJpaRepository fileAttachmentRepository,
            @Autowired(required = false) R2StorageService r2StorageService,
            @Autowired(required = false) R2VideoStorageService r2VideoStorageService,
            @Autowired(required = false) LocalStorageService localStorageService) {
        this.sessionRepository = sessionRepository;
        this.fileAttachmentRepository = fileAttachmentRepository;
        this.r2StorageService = java.util.Optional.ofNullable(r2StorageService);
        this.r2VideoStorageService = java.util.Optional.ofNullable(r2VideoStorageService);
        this.localStorageService = java.util.Optional.ofNullable(localStorageService);
    }

    /**
     * Every hour: expire PENDING sessions older than 1 hour and delete their R2 objects.
     */
    @Scheduled(fixedRate = 3600000)
    @Transactional
    public void expirePendingSessions() {
        Instant cutoff = Instant.now().minus(1, ChronoUnit.HOURS);
        List<UploadSessionJpaEntity> expired = sessionRepository.findByStatusAndExpiresAtBefore("PENDING", cutoff);

        if (expired.isEmpty()) return;

        int count = 0;
        for (UploadSessionJpaEntity session : expired) {
            // Delete from storage
            try {
                expirePendingUpload(session);
            } catch (Exception e) {
                log.warn("[Cleanup] Failed to delete storage object: {}", session.getStorageKey(), e);
            }
            session.setStatus("EXPIRED");
            count++;
        }
        sessionRepository.saveAll(expired);
        log.info("[Cleanup] Expired {} pending upload sessions", count);
    }

    /**
     * Daily 3AM: clean orphaned file_attachments where entity_id IS NULL and age > retention window.
     *
     * Defense in depth — three layers:
     *   1. {@code orphanCleanupEnabled} env kill-switch.
     *   2. Retention window default 30 days (was 7 — too aggressive).
     *   3. Repository query excludes the {@code PENDING_LINK_REVIEW} sentinel which protects
     *      attachments that are awaiting proper entity linkage (set by tactical SQL backfill
     *      when the original entity-link bug was discovered).
     *
     * Each candidate is logged BEFORE deletion so the action can be audited / reverted from logs.
     */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void cleanOrphanedAttachments() {
        if (!orphanCleanupEnabled) {
            log.info("[Cleanup] Orphan attachment cleanup disabled via app.cleanup.orphan-attachments.enabled=false");
            return;
        }

        Instant cutoff = Instant.now().minus(orphanRetentionDays, ChronoUnit.DAYS);
        var orphans = fileAttachmentRepository.findOrphanedBefore(cutoff);

        if (orphans.isEmpty()) {
            log.info("[Cleanup] No orphaned attachments older than {} days", orphanRetentionDays);
            return;
        }

        log.warn("[Cleanup] About to delete {} orphan attachments (cutoff={}). Listing each for audit:",
                orphans.size(), cutoff);
        for (var a : orphans) {
            log.warn("[Cleanup]   - id={} category={} fileName={} url={} uploadedBy={} uploadedAt={}",
                    a.getId(), a.getFileCategory(), a.getFileName(), a.getFileUrl(),
                    a.getUploadedBy(), a.getUploadedAt());
        }

        int count = 0;
        for (var attachment : orphans) {
            try {
                deleteFromStorage(attachment.getFileName(), attachment.getFileCategory(), attachment.getFileUrl());
            } catch (Exception e) {
                log.warn("[Cleanup] Failed to delete orphaned file: {}", attachment.getFileName(), e);
            }
            count++;
        }
        fileAttachmentRepository.deleteAll(orphans);
        log.info("[Cleanup] Removed {} orphaned file attachments", count);
    }

    private void expirePendingUpload(UploadSessionJpaEntity session) {
        if ("MULTIPART".equalsIgnoreCase(session.getUploadStrategy()) && session.getMultipartUploadId() != null) {
            r2VideoStorageService.ifPresent(service -> service.abortMultipartUpload(session.getStorageKey(), session.getMultipartUploadId()));
            return;
        }
        deleteFromStorage(session.getStorageKey(), session.getFolder(), null);
    }

    private void deleteFromStorage(String key, String storageHint, String fileUrl) {
        boolean usePrivateVideoStorage = "VIDEO".equalsIgnoreCase(storageHint)
                || "videos".equalsIgnoreCase(storageHint)
                || (fileUrl != null && fileUrl.startsWith("video-private://"));

        if (usePrivateVideoStorage && r2VideoStorageService.isPresent()) {
            r2VideoStorageService.get().delete(key);
        } else if (r2StorageService.isPresent()) {
            r2StorageService.get().delete(key);
        } else if (localStorageService.isPresent()) {
            localStorageService.get().delete(key);
        }
    }
}

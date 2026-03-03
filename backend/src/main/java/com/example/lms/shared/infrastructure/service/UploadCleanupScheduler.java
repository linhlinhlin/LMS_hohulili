package com.example.lms.shared.infrastructure.service;

import com.example.lms.shared.infrastructure.persistence.entity.UploadSessionJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.FileAttachmentJpaRepository;
import com.example.lms.shared.infrastructure.persistence.repository.UploadSessionJpaRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
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
    private final java.util.Optional<LocalStorageService> localStorageService;

    @Autowired
    public UploadCleanupScheduler(
            UploadSessionJpaRepository sessionRepository,
            FileAttachmentJpaRepository fileAttachmentRepository,
            @Autowired(required = false) R2StorageService r2StorageService,
            @Autowired(required = false) LocalStorageService localStorageService) {
        this.sessionRepository = sessionRepository;
        this.fileAttachmentRepository = fileAttachmentRepository;
        this.r2StorageService = java.util.Optional.ofNullable(r2StorageService);
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
                deleteFromStorage(session.getStorageKey());
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
     * Daily 3AM: clean orphaned file_attachments where entityId IS NULL and age > 7 days.
     */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void cleanOrphanedAttachments() {
        Instant cutoff = Instant.now().minus(7, ChronoUnit.DAYS);
        var orphans = fileAttachmentRepository.findOrphanedBefore(cutoff);

        if (orphans.isEmpty()) return;

        int count = 0;
        for (var attachment : orphans) {
            try {
                deleteFromStorage(attachment.getFileName());
            } catch (Exception e) {
                log.warn("[Cleanup] Failed to delete orphaned file: {}", attachment.getFileName(), e);
            }
            count++;
        }
        fileAttachmentRepository.deleteAll(orphans);
        log.info("[Cleanup] Removed {} orphaned file attachments", count);
    }

    private void deleteFromStorage(String key) {
        if (r2StorageService.isPresent()) {
            r2StorageService.get().delete(key);
        } else if (localStorageService.isPresent()) {
            localStorageService.get().delete(key);
        }
    }
}

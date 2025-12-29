package com.example.lms.service;

import com.example.lms.entity.FileAttachment;
import com.example.lms.repository.FileAttachmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileCleanupService {

    private final FileAttachmentRepository fileAttachmentRepository;

    /**
     * Run daily at 3:00 AM to clean up TEMP files older than 24 hours
     */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void cleanupTempFiles() {
        log.info("Starting scheduled cleanup of TEMP files...");

        LocalDateTime threshold = LocalDateTime.now().minusHours(24);
        List<FileAttachment> tempFiles = fileAttachmentRepository.findByStatusAndUploadedAtBefore("TEMP", threshold);
        
        log.info("Found {} TEMP files to cleanup", tempFiles.size());

        for (FileAttachment file : tempFiles) {
            try {
                // Delete physical file
                Path path = Paths.get(file.getStoragePath());
                Files.deleteIfExists(path);
                
                // Delete from DB (or mark purely deleted if prefer soft delete, but for TEMP hard delete is fine)
                fileAttachmentRepository.delete(file);
                
                log.info("Cleaned up TEMP file: id={}, path={}", file.getId(), file.getStoragePath());
            } catch (IOException e) {
                log.error("Failed to delete temp file: {}", file.getStoragePath(), e);
            } catch (Exception e) {
                log.error("Failed to clean up file record: {}", file.getId(), e);
            }
        }
        
        log.info("Cleanup completed.");
    }
}

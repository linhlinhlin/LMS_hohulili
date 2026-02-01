package com.example.lms.shared.application.service;

import com.example.lms.shared.domain.model.ContentBlock;
import com.example.lms.shared.infrastructure.persistence.entity.FileAttachmentJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.FileAttachmentJpaRepository;
import com.example.lms.shared.infrastructure.service.R2StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileManagementService {

    private final R2StorageService r2StorageService;
    private final FileAttachmentJpaRepository fileRepository;

    /**
     * Uploads a file to R2 and creates a metadata record in DB.
     * The record is initially "orphan" (no entity linked).
     */
    @Transactional
    public FileAttachmentJpaEntity uploadFile(MultipartFile file, String folder, UUID uploadedBy) throws IOException {
        // 1. Upload to R2
        R2StorageService.UploadResult result = r2StorageService.upload(file, folder);

        // 2. Save metadata to DB
        FileAttachmentJpaEntity attachment = FileAttachmentJpaEntity.builder()
                .fileUrl(result.publicUrl())
                .fileName(result.storageKey())
                .originalName(file.getOriginalFilename())
                .fileSize(result.fileSize())
                .contentType(file.getContentType())
                .uploadedBy(uploadedBy)
                .fileCategory("QUESTION_IMAGE") // Default category for now
                .status("ACTIVE")
                .build();

        return fileRepository.save(attachment);
    }

    /**
     * Scans content blocks for file URLs and links them to the entity.
     * This handles the "Hybrid" logic: content has URL, DB has metadata.
     */
    @Transactional
    public void linkFilesToEntity(List<ContentBlock> blocks, UUID entityId, String entityType) {
        if (blocks == null || blocks.isEmpty()) return;

        // Recursively find all image URLs in blocks
        // For now, flat scan is enough for standard EditorJS blocks
        for (ContentBlock block : blocks) {
            String url = extractUrlFromBlock(block);
            if (url != null) {
                // Find attachment by URL and update entity_id
                // Note: accurate lookup depends on storing the exact URL or having a way to match.
                // Since we store result.publicUrl() in DB, we can match.
                // However, R2StorageService returns full public URL.
                linkFileByUrl(url, entityId, entityType);
            }
        }
    }

    private String extractUrlFromBlock(ContentBlock block) {
        if ("image".equals(block.getType()) && block.getData() != null) {
            // EditorJS image block structure:
            // data: { file: { url: "..." }, url: "...", caption: "..." }
            java.util.Map<String, Object> data = block.getData();
            
            // Check direct "url" (some versions)
            if (data.containsKey("url")) {
                return (String) data.get("url");
            }
            
            // Check nested "file" -> "url" (standard EditorJS)
            Object fileObj = data.get("file");
            if (fileObj instanceof java.util.Map) {
                java.util.Map<?, ?> fileMap = (java.util.Map<?, ?>) fileObj;
                Object url = fileMap.get("url");
                if (url instanceof String) {
                    return (String) url;
                }
            }
        }
        return null;
    }

    private void linkFileByUrl(String url, UUID entityId, String entityType) {
        fileRepository.findByFileUrl(url).ifPresent(file -> {
            file.setEntityId(entityId);
            file.setEntityType(entityType);
            fileRepository.save(file);
            log.info("Linked file {} to {} {}", file.getId(), entityType, entityId);
        });
    }
}

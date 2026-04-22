package com.example.lms.shared.infrastructure.service;

import com.example.lms.shared.application.port.FileManagementPort;
import com.example.lms.shared.domain.model.ContentBlock;
import com.example.lms.shared.infrastructure.persistence.entity.FileAttachmentJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.FileAttachmentJpaRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Slf4j
public class FileManagementService implements FileManagementPort {

    private final Optional<R2StorageService> r2StorageService;
    private final Optional<R2VideoStorageService> r2VideoStorageService;
    private final Optional<LocalStorageService> localStorageService;
    private final FileAttachmentJpaRepository fileRepository;

    @Autowired
    public FileManagementService(
            @Autowired(required = false) R2StorageService r2StorageService,
            @Autowired(required = false) R2VideoStorageService r2VideoStorageService,
            @Autowired(required = false) LocalStorageService localStorageService,
            FileAttachmentJpaRepository fileRepository) {
        this.r2StorageService = Optional.ofNullable(r2StorageService);
        this.r2VideoStorageService = Optional.ofNullable(r2VideoStorageService);
        this.localStorageService = Optional.ofNullable(localStorageService);
        this.fileRepository = fileRepository;
    }

    /**
     * Uploads a file to storage (R2 or local) and creates a metadata record in DB.
     * The record is initially "orphan" (no entity linked).
     * Priority: R2 (prod) → Local (dev) → throw
     */
    @Transactional
    public FileAttachmentJpaEntity uploadFile(MultipartFile file, String folder, UUID uploadedBy) throws IOException {
        UploadResult result;
        if (isVideoFolder(folder) && r2VideoStorageService.isPresent()) {
            R2VideoStorageService.UploadResult upload = r2VideoStorageService.get().upload(file, folder);
            result = new UploadResult(upload.storageKey(), upload.internalUrl(), upload.fileSize());
        } else if (r2StorageService.isPresent()) {
            R2StorageService.UploadResult upload = r2StorageService.get().upload(file, folder);
            result = new UploadResult(upload.storageKey(), upload.publicUrl(), upload.fileSize());
        } else if (localStorageService.isPresent()) {
            R2StorageService.UploadResult upload = localStorageService.get().upload(file, folder);
            result = new UploadResult(upload.storageKey(), upload.publicUrl(), upload.fileSize());
        } else {
            throw new IllegalStateException("File upload is not available: no storage service configured");
        }

        // 2. Save metadata to DB
        FileAttachmentJpaEntity attachment = FileAttachmentJpaEntity.builder()
                .fileUrl(result.fileUrl())
                .fileName(result.storageKey())
                .originalName(file.getOriginalFilename())
                .fileSize(result.fileSize())
                .contentType(file.getContentType())
                .uploadedBy(uploadedBy)
                .fileCategory(mapFolderToCategory(folder))
                .status("ACTIVE")
                .build();

        return fileRepository.save(attachment);
    }

    /**
     * Scans content blocks for file URLs and links them to the entity.
     * This handles the "Hybrid" logic: content has URL, DB has metadata.
     */
    @Override
    @Transactional
    public void linkFilesToEntity(List<ContentBlock> blocks, UUID entityId, String entityType) {
        if (blocks == null || blocks.isEmpty()) return;

        // Recursively find all image URLs in blocks
        // For now, flat scan is enough for standard EditorJS blocks
        for (ContentBlock block : blocks) {
            String url = extractUrlFromBlock(block);
            if (url != null) {
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

    private String mapFolderToCategory(String folder) {
        if (folder == null) return "GENERAL";
        return switch (folder) {
            case "course", "course-thumbnails" -> "COURSE_THUMBNAIL";
            case "editor-images", "question-images" -> "EDITOR_IMAGE";
            case "avatars" -> "AVATAR";
            case "videos" -> "VIDEO";
            default -> "GENERAL";
        };
    }

    @Transactional
    public void linkFileByUrl(String url, UUID entityId, String entityType) {
        fileRepository.findByFileUrl(url).ifPresent(file -> {
            file.setEntityId(entityId);
            file.setEntityType(entityType);
            fileRepository.save(file);
            log.info("Linked file {} to {} {}", file.getId(), entityType, entityId);
        });
    }

    private boolean isVideoFolder(String folder) {
        return "videos".equalsIgnoreCase(folder);
    }

    private record UploadResult(String storageKey, String fileUrl, long fileSize) {}
}

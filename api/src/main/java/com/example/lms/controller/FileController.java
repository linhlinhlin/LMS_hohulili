package com.example.lms.controller;

import com.example.lms.entity.FileAttachment;
import com.example.lms.repository.FileAttachmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriUtils;
import java.nio.charset.StandardCharsets;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
@Slf4j
public class FileController {

    private final FileAttachmentRepository fileAttachmentRepository;
    private final com.example.lms.service.SectionService sectionService;

    @GetMapping("/{fileId}/stream")
    public ResponseEntity<Resource> streamFile(@PathVariable UUID fileId) {
        log.info("[STREAM] Request for fileId: {}", fileId);
        try {
            FileAttachment attachment = fileAttachmentRepository.findById(fileId)
                    .orElseThrow(() -> {
                        log.error("[STREAM] File not found in DB: {}", fileId);
                        return new RuntimeException("File not found");
                    });

            log.info("[STREAM] Found attachment: {}, storagePath: {}", attachment.getOriginalFilename(), attachment.getStoragePath());

            Path filePath = Paths.get(attachment.getStoragePath()).normalize();
            Resource resource = new FileSystemResource(filePath);

            if (resource.exists()) {
                String contentType = attachment.getContentType();
                if (contentType == null) {
                    contentType = "application/octet-stream";
                }
                log.info("[STREAM] Serving file: {}, contentType: {}, size: {}", 
                    attachment.getOriginalFilename(), contentType, resource.contentLength());

                String encodedFileName = UriUtils.encode(attachment.getOriginalFilename(), StandardCharsets.UTF_8);
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename*=UTF-8''" + encodedFileName)
                        .body(resource);
            } else {
                log.error("[STREAM] Physical file NOT FOUND at: {}", attachment.getStoragePath());
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            log.error("[STREAM] Error streaming file {}: {}", fileId, e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/view/section/{sectionId}")
    public ResponseEntity<Resource> viewSectionFile(@PathVariable UUID sectionId) {
        try {
            List<FileAttachment> attachments = fileAttachmentRepository.findByEntityIdAndEntityTypeAndStatus(
                    sectionId, "SECTION_MATERIAL", "AVAILABLE");

            if (attachments.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            return streamFile(attachments.get(0).getId());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @GetMapping("/download/{sectionId}")
    public ResponseEntity<Resource> downloadSectionFile(@PathVariable UUID sectionId) {
        try {
             List<FileAttachment> attachments = fileAttachmentRepository.findByEntityIdAndEntityTypeAndStatus(
                    sectionId, "SECTION_MATERIAL", "AVAILABLE");

            if (attachments.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            FileAttachment attachment = attachments.get(0);
            Path filePath = Paths.get(attachment.getStoragePath()).normalize();
            Resource resource = new FileSystemResource(filePath);

            if (resource.exists()) {
                String encodedFileName = UriUtils.encode(attachment.getOriginalFilename(), StandardCharsets.UTF_8);
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(attachment.getContentType()))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + encodedFileName)
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/migrate")
    public ResponseEntity<String> migrateLegacyUrls() {
        sectionService.migrateLegacyFileUrls();
        return ResponseEntity.ok("Migration triggered successfully");
    }
}

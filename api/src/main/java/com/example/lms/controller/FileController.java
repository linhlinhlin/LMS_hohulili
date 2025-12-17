package com.example.lms.controller;

import com.example.lms.entity.FileAttachment;
import com.example.lms.repository.FileAttachmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
public class FileController {

    private final FileAttachmentRepository fileAttachmentRepository;

    @GetMapping("/view/section/{sectionId}")
    public ResponseEntity<Resource> viewSectionFile(@PathVariable UUID sectionId) {
        try {
            // 1. Find attachment by Section ID
            List<FileAttachment> attachments = fileAttachmentRepository.findByEntityIdAndEntityTypeAndStatus(
                    sectionId, "SECTION_MATERIAL", "AVAILABLE");

            if (attachments.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            // Assume first file is the main material
            FileAttachment attachment = attachments.get(0);
            
            // 2. Resolve path
            // storedPath is absolute path as set in FileService
            Path filePath = Paths.get(attachment.getStoragePath());
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists()) {
                // 3. Determine Content-Type (default to PDF or image if known, or generic)
                String contentType = attachment.getContentType();
                if (contentType == null) {
                    contentType = "application/octet-stream";
                }

                // 4. Return Inline
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + attachment.getOriginalFilename() + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // Support existing download behavior if needed, or redirect to this logic
    @GetMapping("/download/{sectionId}")
    public ResponseEntity<Resource> downloadSectionFile(@PathVariable UUID sectionId) {
        try {
             List<FileAttachment> attachments = fileAttachmentRepository.findByEntityIdAndEntityTypeAndStatus(
                    sectionId, "SECTION_MATERIAL", "AVAILABLE");

            if (attachments.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            FileAttachment attachment = attachments.get(0);
            Path filePath = Paths.get(attachment.getStoragePath());
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists()) {
                 return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(attachment.getContentType()))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + attachment.getOriginalFilename() + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}

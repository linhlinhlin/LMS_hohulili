package com.example.lms.shared.infrastructure.web;

import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.beans.factory.annotation.Value;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v3/files")
@RequiredArgsConstructor
@Tag(name = "File Upload V3", description = "File Management (V3)")
public class FileUploadControllerV3 {

    // Simple local storage for now
    private static final String UPLOAD_DIR = "uploads"; 

    @PostMapping(value = "/upload/editor", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTRUCTOR', 'ADMIN')")
    @Operation(summary = "Upload file from editor")
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadFile(@RequestParam("image") MultipartFile file) {
        try {
            // Ensure directory exists
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Generate unique filename
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.lastIndexOf(".") > 0) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String filename = UUID.randomUUID().toString() + extension;
            Path filePath = uploadPath.resolve(filename);

            // Save file
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // Return URL (Assuming static resource handler is configured, or just return path for now)
            // Ideally backend serves this via /files/{filename} or similar.
            // For now, returning a relative path or absolute URL if domain known.
            String fileUrl = "/uploads/" + filename; // Frontend might need full URL or proxy
            
            // Editorjs/Editor often expects specific format:
            // { success: 1, file: { url: "..." } }
            // But ourApiResponse wraps it. Frontend might need to unwrap.
            
            Map<String, Object> fileData = new HashMap<>();
            fileData.put("url", fileUrl);
            fileData.put("width", 0); // Placeholder
            fileData.put("height", 0); // Placeholder

            return ResponseEntity.ok(ApiResponse.success(fileData));

        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(ApiResponse.error("File upload failed: " + e.getMessage()));
        }
    }
}

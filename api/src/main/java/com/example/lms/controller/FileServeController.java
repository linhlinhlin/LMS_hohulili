package com.example.lms.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.File;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/api/v1/files")
public class FileServeController {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @GetMapping("/{type}/{year}/{month}/{filename}")
    public ResponseEntity<Resource> serve(
            @PathVariable String type,
            @PathVariable String year,
            @PathVariable String month,
            @PathVariable String filename
    ) {
        Path filePath = Paths.get(uploadDir, type, year, month, filename).normalize();
        File file = filePath.toFile();
        if (!file.exists() || !file.isFile()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        FileSystemResource resource = new FileSystemResource(file);
        String contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
        try {
            String probe = java.nio.file.Files.probeContentType(filePath);
            if (probe != null) contentType = probe;
        } catch (Exception ignored) {}

        // Add CORS headers for PDF embedding
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"");
        headers.add(HttpHeaders.CONTENT_TYPE, contentType);
        headers.add("Access-Control-Allow-Origin", "*");
        headers.add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        headers.add("Access-Control-Allow-Headers", "*");
        headers.add("Access-Control-Expose-Headers", "Content-Disposition, Content-Type, Content-Length");
        // Allow embedding in iframes from same origin and specific domains
        headers.add("X-Frame-Options", "ALLOWALL");
        // Additional headers for PDF embedding
        headers.add("Content-Security-Policy", "frame-ancestors *");

        return ResponseEntity.ok()
                .headers(headers)
                .body(resource);
    }
}

package com.example.lms.controller;

import com.example.lms.service.DocumentParserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * REST Controller for document upload and text extraction
 */
@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
@Slf4j
public class DocumentController {

    private final DocumentParserService documentParserService;

    /**
     * Upload and parse .doc/.docx file to extract text content
     * 
     * @param file The uploaded document file
     * @return JSON response with extracted text content
     */
    @PostMapping("/upload")
    @PreAuthorize("hasRole('TEACHER') or hasRole('ADMIN')")
    public ResponseEntity<?> uploadDocument(@RequestParam("file") MultipartFile file) {
        try {
            log.info("Received document upload request. Filename: {}, Size: {} bytes", 
                    file.getOriginalFilename(), file.getSize());

            // Validate file
            documentParserService.validateFile(file);

            // Extract text content
            String extractedContent = documentParserService.extractTextFromDocument(file);

            log.info("Successfully extracted text content. Length: {} characters", 
                    extractedContent.length());

            return ResponseEntity.ok(Map.of(
                "success", true,
                "content", extractedContent,
                "filename", file.getOriginalFilename(),
                "message", "Document processed successfully"
            ));

        } catch (IllegalArgumentException e) {
            log.warn("Invalid file upload request: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage(),
                "message", "Invalid file or file format"
            ));

        } catch (Exception e) {
            log.error("Error processing document upload", e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "error", "Internal server error",
                "message", "Could not process the document. Please try again."
            ));
        }
    }

    /**
     * Get supported file formats
     */
    @GetMapping("/supported-formats")
    public ResponseEntity<Map<String, Object>> getSupportedFormats() {
        return ResponseEntity.ok(Map.of(
            "formats", new String[]{".doc", ".docx"},
            "maxSize", "10MB",
            "description", "Microsoft Word documents"
        ));
    }
}
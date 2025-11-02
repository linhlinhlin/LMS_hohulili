package com.example.lms.service;

import org.apache.poi.hwpf.HWPFDocument;
import org.apache.poi.hwpf.extractor.WordExtractor;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * Service for parsing document files (.doc/.docx) and extracting text content
 */
@Service
public class DocumentParserService {

    /**
     * Extract text content from uploaded .doc or .docx file
     * @param file MultipartFile containing the document
     * @return Extracted plain text content
     * @throws IOException if file cannot be read or parsed
     * @throws IllegalArgumentException if file format is not supported
     */
    public String extractTextFromDocument(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        String filename = file.getOriginalFilename();
        if (filename == null) {
            throw new IllegalArgumentException("Filename is null");
        }

        String lowercaseFilename = filename.toLowerCase();
        
        try {
            if (lowercaseFilename.endsWith(".docx")) {
                return extractFromDocx(file);
            } else if (lowercaseFilename.endsWith(".doc")) {
                return extractFromDoc(file);
            } else {
                throw new IllegalArgumentException("Unsupported file format. Only .doc and .docx files are supported.");
            }
        } catch (Exception e) {
            if (e instanceof IllegalArgumentException) {
                throw e;
            }
            throw new IOException("Error parsing document: " + e.getMessage(), e);
        }
    }

    /**
     * Extract text from .docx file (Office 2007+)
     */
    private String extractFromDocx(MultipartFile file) throws IOException {
        try (XWPFDocument document = new XWPFDocument(file.getInputStream());
             XWPFWordExtractor extractor = new XWPFWordExtractor(document)) {
            
            String text = extractor.getText();
            return cleanAndNormalizeText(text);
        }
    }

    /**
     * Extract text from .doc file (Office 97-2003)
     */
    private String extractFromDoc(MultipartFile file) throws IOException {
        try (HWPFDocument document = new HWPFDocument(file.getInputStream());
             WordExtractor extractor = new WordExtractor(document)) {
            
            String text = extractor.getText();
            return cleanAndNormalizeText(text);
        }
    }

    /**
     * Clean and normalize extracted text
     */
    private String cleanAndNormalizeText(String text) {
        if (text == null) {
            return "";
        }
        
        // Clean up extra whitespace and normalize line breaks
        return text.trim()
                  .replaceAll("\\r\\n", "\n")  // Windows line endings
                  .replaceAll("\\r", "\n")     // Mac line endings
                  .replaceAll("\\n{3,}", "\n\n"); // Multiple line breaks to double
    }

    /**
     * Validate file before processing
     */
    public void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("No file provided");
        }

        // Check file size (max 10MB)
        long maxSize = 10 * 1024 * 1024; // 10MB
        if (file.getSize() > maxSize) {
            throw new IllegalArgumentException("File size exceeds maximum limit of 10MB");
        }

        // Check file extension
        String filename = file.getOriginalFilename();
        if (filename == null || 
            (!filename.toLowerCase().endsWith(".doc") && !filename.toLowerCase().endsWith(".docx"))) {
            throw new IllegalArgumentException("Invalid file format. Only .doc and .docx files are allowed");
        }
    }
}
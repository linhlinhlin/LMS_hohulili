package com.example.lms.shared.infrastructure.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Set;

/**
 * Converts Office documents (DOCX, XLSX, PPTX) to PDF via Gotenberg.
 *
 * Gotenberg is a Docker-based conversion service that wraps LibreOffice
 * headless behind a clean REST API. This is the same pattern used by
 * Coursera and Canvas LMS for document preview.
 *
 * API: POST /forms/libreoffice/convert
 *   - multipart/form-data with the source file
 *   - returns application/pdf bytes
 *
 * @see <a href="https://gotenberg.dev/docs/routes#libreoffice">Gotenberg Docs</a>
 */
@Slf4j
@Service
public class DocumentConversionService {

    private static final Set<String> CONVERTIBLE_EXTENSIONS = Set.of(
            "doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp", "rtf", "txt", "csv"
    );

    private static final Duration CONVERSION_TIMEOUT = Duration.ofSeconds(120);

    private final WebClient webClient;
    private final boolean enabled;

    public DocumentConversionService(
            @Value("${gotenberg.url:}") String gotenbergUrl
    ) {
        this.enabled = gotenbergUrl != null && !gotenbergUrl.isBlank();
        this.webClient = this.enabled
                ? WebClient.builder().baseUrl(gotenbergUrl).build()
                : WebClient.builder().build();

        if (this.enabled) {
            log.info("DocumentConversionService enabled — Gotenberg at {}", gotenbergUrl);
        } else {
            log.info("DocumentConversionService disabled — no gotenberg.url configured");
        }
    }

    /**
     * Check if a file extension can be converted to PDF.
     */
    public boolean canConvert(String fileName) {
        if (!enabled || fileName == null) return false;
        String ext = getExtension(fileName).toLowerCase();
        return CONVERTIBLE_EXTENSIONS.contains(ext);
    }

    /**
     * Check if the service is available.
     */
    public boolean isEnabled() {
        return enabled;
    }

    /**
     * Convert a document to PDF bytes.
     *
     * @param fileBytes the source document bytes
     * @param fileName  the original file name (used for extension detection)
     * @return PDF bytes, or null if conversion fails
     */
    public byte[] convertToPdf(byte[] fileBytes, String fileName) {
        if (!canConvert(fileName)) {
            return null;
        }

        try {
            MultipartBodyBuilder builder = new MultipartBodyBuilder();
            builder.part("files", new ByteArrayResource(fileBytes) {
                @Override
                public String getFilename() {
                    return fileName;
                }
            }).contentType(MediaType.APPLICATION_OCTET_STREAM);

            byte[] pdfBytes = webClient.post()
                    .uri("/forms/libreoffice/convert")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .bodyToMono(byte[].class)
                    .block(CONVERSION_TIMEOUT);

            if (pdfBytes != null && pdfBytes.length > 0) {
                log.info("Converted {} ({} bytes) → PDF ({} bytes)",
                        fileName, fileBytes.length, pdfBytes.length);
                return pdfBytes;
            }

            log.warn("Gotenberg returned empty response for {}", fileName);
            return null;
        } catch (Exception e) {
            log.error("Document conversion failed for {}: {}", fileName, e.getMessage());
            return null;
        }
    }

    private String getExtension(String fileName) {
        int dot = fileName.lastIndexOf('.');
        return dot >= 0 ? fileName.substring(dot + 1) : "";
    }
}

package com.example.lms.shared.infrastructure.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
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

    private static final Duration CONVERSION_TIMEOUT = Duration.ofMinutes(15);
    private static final Duration HEALTH_TIMEOUT = Duration.ofSeconds(3);
    private static final int DEFAULT_MAX_IN_MEMORY_BYTES = 64 * 1024 * 1024;

    private final WebClient webClient;
    private final boolean enabled;

    public DocumentConversionService(
            @Value("${gotenberg.url:}") String gotenbergUrl,
            @Value("${gotenberg.max-in-memory-bytes:" + DEFAULT_MAX_IN_MEMORY_BYTES + "}") int maxInMemoryBytes
    ) {
        this.enabled = gotenbergUrl != null && !gotenbergUrl.isBlank();
        this.webClient = this.enabled
                ? WebClient.builder()
                        .baseUrl(gotenbergUrl)
                        .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(maxInMemoryBytes))
                        .build()
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
     * Check whether Gotenberg and its LibreOffice module are currently healthy.
     */
    public boolean isHealthy() {
        if (!enabled) {
            return false;
        }

        try {
            Boolean healthy = webClient.get()
                    .uri("/health")
                    .retrieve()
                    .toBodilessEntity()
                    .map(response -> response.getStatusCode().is2xxSuccessful())
                    .block(HEALTH_TIMEOUT);
            return Boolean.TRUE.equals(healthy);
        } catch (Exception e) {
            log.warn("Gotenberg health check failed: {}", e.getMessage());
            return false;
        }
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
            addPreviewCompressionFields(builder);

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

    /**
     * Convert a document to PDF bytes without loading the source document into JVM heap.
     * This path is used for legacy large PPTX files already stored in object storage.
     */
    public byte[] convertToPdf(Path filePath, String fileName) {
        if (!canConvert(fileName)) {
            return null;
        }

        try {
            MultipartBodyBuilder builder = new MultipartBodyBuilder();
            builder.part("files", new FileSystemResource(filePath))
                    .filename(fileName)
                    .contentType(MediaType.APPLICATION_OCTET_STREAM);
            addPreviewCompressionFields(builder);

            byte[] pdfBytes = webClient.post()
                    .uri("/forms/libreoffice/convert")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .bodyToMono(byte[].class)
                    .block(CONVERSION_TIMEOUT);

            if (pdfBytes != null && pdfBytes.length > 0) {
                log.info("Converted {} from temp file {} -> PDF ({} bytes)",
                        fileName, filePath, pdfBytes.length);
                return pdfBytes;
            }

            log.warn("Gotenberg returned empty response for {}", fileName);
            return null;
        } catch (Exception e) {
            log.error("Document conversion failed for {}: {}", fileName, e.getMessage());
            return null;
        }
    }

    /**
     * Convert a document to a PDF file while streaming Gotenberg's response to disk.
     * This avoids buffering large preview PDFs in the backend heap.
     */
    public boolean convertToPdfFile(Path sourcePath, String fileName, Path outputPath) {
        if (!canConvert(fileName)) {
            return false;
        }

        try {
            MultipartBodyBuilder builder = new MultipartBodyBuilder();
            builder.part("files", new FileSystemResource(sourcePath))
                    .filename(fileName)
                    .contentType(MediaType.APPLICATION_OCTET_STREAM);
            addPreviewCompressionFields(builder);

            Long outputBytes = webClient.post()
                    .uri("/forms/libreoffice/convert")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .exchangeToMono(response -> {
                        if (response.statusCode().is2xxSuccessful()) {
                            return DataBufferUtils.write(
                                            response.bodyToFlux(org.springframework.core.io.buffer.DataBuffer.class),
                                            outputPath,
                                            StandardOpenOption.CREATE,
                                            StandardOpenOption.TRUNCATE_EXISTING,
                                            StandardOpenOption.WRITE)
                                    .then(Mono.fromCallable(() -> Files.size(outputPath)));
                        }

                        return response.bodyToMono(String.class)
                                .defaultIfEmpty("")
                                .flatMap(body -> Mono.error(new IllegalStateException(
                                        "Gotenberg returned " + response.statusCode().value() + ": " + body)));
                    })
                    .block(CONVERSION_TIMEOUT);

            if (outputBytes != null && outputBytes > 0) {
                log.info("Converted {} from temp file {} -> PDF file {} ({} bytes)",
                        fileName, sourcePath, outputPath, outputBytes);
                return true;
            }

            log.warn("Gotenberg returned empty PDF file for {}", fileName);
            return false;
        } catch (Exception e) {
            log.error("Document conversion failed for {}: {}", fileName, e.getMessage());
            return false;
        }
    }

    private void addPreviewCompressionFields(MultipartBodyBuilder builder) {
        builder.part("reduceImageResolution", "true");
        builder.part("maxImageResolution", "150");
        builder.part("quality", "80");
    }

    private String getExtension(String fileName) {
        int dot = fileName.lastIndexOf('.');
        return dot >= 0 ? fileName.substring(dot + 1) : "";
    }
}

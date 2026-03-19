package com.example.lms.learning_delivery.infrastructure.pdf;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests for CertificatePdfService.
 *
 * Verifies:
 * - Non-empty PDF byte array generation
 * - PDF starts with %PDF header
 * - Vietnamese characters accepted in student name and course title
 */
@DisplayName("CertificatePdfService")
class CertificatePdfServiceTest {

    private final CertificatePdfService service = new CertificatePdfService();

    @Nested
    @DisplayName("PDF generation")
    class PdfGeneration {

        @Test
        @DisplayName("Should generate non-empty byte array")
        void shouldGenerateNonEmptyByteArray() throws IOException {
            byte[] pdf = service.generateCertificate(
                    "Nguyen Van A",
                    "Introduction to Navigation",
                    Instant.now(),
                    UUID.randomUUID()
            );

            assertThat(pdf).isNotNull();
            assertThat(pdf).isNotEmpty();
            assertThat(pdf.length).isGreaterThan(100);
        }

        @Test
        @DisplayName("Should start with %PDF header")
        void shouldStartWithPdfHeader() throws IOException {
            byte[] pdf = service.generateCertificate(
                    "Le Thi B",
                    "Maritime Safety",
                    Instant.now(),
                    UUID.randomUUID()
            );

            // PDF files always start with %PDF
            String header = new String(pdf, 0, Math.min(pdf.length, 5));
            assertThat(header).startsWith("%PDF");
        }

        @Test
        @DisplayName("Should accept Vietnamese characters in name and course title")
        void shouldAcceptVietnameseCharacters() throws IOException {
            byte[] pdf = service.generateCertificate(
                    "Trần Văn Cường",
                    "Khóa học An toàn hàng hải",
                    Instant.now(),
                    UUID.randomUUID()
            );

            assertThat(pdf).isNotNull();
            assertThat(pdf).isNotEmpty();
            // Verify it's a valid PDF by checking header
            String header = new String(pdf, 0, Math.min(pdf.length, 5));
            assertThat(header).startsWith("%PDF");
        }
    }
}

package com.example.lms.learning_delivery.infrastructure.pdf;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Generates certificate PDF documents using Apache PDFBox.
 * Maritime-branded with verification token.
 */
@Service
public class CertificatePdfService {

    private static final String FONT_REGULAR_PATH = "/fonts/roboto-400.ttf";
    private static final String FONT_BOLD_PATH = "/fonts/roboto-500.ttf";

    private static final DateTimeFormatter VN_DATE = DateTimeFormatter
            .ofPattern("dd/MM/yyyy")
            .withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    /**
     * Generate a certificate PDF.
     *
     * @param studentName       Student full name
     * @param courseTitle        Course title
     * @param issuedAt          Issue date
     * @param verificationToken Verification token for public verification
     * @return PDF bytes
     */
    public byte[] generateCertificate(
            String studentName,
            String courseTitle,
            Instant issuedAt,
            UUID verificationToken
    ) throws IOException {
        try (PDDocument doc = new PDDocument()) {
            // Landscape A4
            PDPage page = new PDPage(new PDRectangle(PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth()));
            doc.addPage(page);

            float pageWidth = page.getMediaBox().getWidth();
            float pageHeight = page.getMediaBox().getHeight();

            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                PDFont fontBold = loadFont(doc, FONT_BOLD_PATH);
                PDFont fontRegular = loadFont(doc, FONT_REGULAR_PATH);
                PDFont fontItalic = fontRegular;

                // Border
                float borderMargin = 30;
                cs.setStrokingColor(0f / 255, 86f / 255, 210f / 255); // #0056D2
                cs.setLineWidth(3);
                cs.addRect(borderMargin, borderMargin,
                        pageWidth - 2 * borderMargin, pageHeight - 2 * borderMargin);
                cs.stroke();

                // Inner border
                cs.setLineWidth(1);
                cs.addRect(borderMargin + 8, borderMargin + 8,
                        pageWidth - 2 * (borderMargin + 8), pageHeight - 2 * (borderMargin + 8));
                cs.stroke();

                float centerX = pageWidth / 2;
                float y = pageHeight - 100;

                // Header
                drawCenteredText(cs, "LMS MARITIME EDUCATION", centerX, y, fontBold, 14, pageWidth);
                y -= 40;

                // Title
                drawCenteredText(cs, "CHUNG NHAN HOAN THANH KHOA HOC", centerX, y, fontBold, 24, pageWidth);
                y -= 15;
                drawCenteredText(cs, "CERTIFICATE OF COMPLETION", centerX, y, fontItalic, 14, pageWidth);
                y -= 50;

                // Body
                drawCenteredText(cs, "Chung nhan rang", centerX, y, fontRegular, 14, pageWidth);
                y -= 40;

                // Student name (large)
                drawCenteredText(cs, studentName, centerX, y, fontBold, 28, pageWidth);
                y -= 40;

                drawCenteredText(cs, "Da hoan thanh khoa hoc", centerX, y, fontRegular, 14, pageWidth);
                y -= 35;

                // Course title
                drawCenteredText(cs, courseTitle, centerX, y, fontBold, 20, pageWidth);
                y -= 50;

                // Date
                String dateStr = "Ngay cap: " + VN_DATE.format(issuedAt);
                drawCenteredText(cs, dateStr, centerX, y, fontRegular, 12, pageWidth);
                y -= 30;

                // Verification
                String verifyStr = "Ma xac minh: " + verificationToken.toString().substring(0, 8).toUpperCase();
                drawCenteredText(cs, verifyStr, centerX, y, fontRegular, 10, pageWidth);
                y -= 15;

                String verifyUrl = "Xac minh tai: /api/v3/certificates/verify/" + verificationToken;
                drawCenteredText(cs, verifyUrl, centerX, y, fontItalic, 9, pageWidth);
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            doc.save(baos);
            return baos.toByteArray();
        }
    }

    private PDFont loadFont(PDDocument doc, String resourcePath) throws IOException {
        try (InputStream input = CertificatePdfService.class.getResourceAsStream(resourcePath)) {
            if (input == null) {
                throw new IOException("Không tìm thấy font resource: " + resourcePath);
            }
            return PDType0Font.load(doc, input);
        }
    }

    private void drawCenteredText(PDPageContentStream cs, String text, float centerX, float y,
                                   PDFont font, float fontSize, float pageWidth) throws IOException {
        float textWidth = font.getStringWidth(text) / 1000 * fontSize;
        float x = (pageWidth - textWidth) / 2;
        cs.beginText();
        cs.setFont(font, fontSize);
        cs.newLineAtOffset(x, y);
        cs.showText(text);
        cs.endText();
    }
}

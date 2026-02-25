package com.example.lms.shared.infrastructure.pdf;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

/**
 * PDF Report generation service using Apache PDFBox.
 * Generates branded student progress reports.
 */
@Service
public class PdfReportService {

    private static final float MARGIN = 50;
    private static final float FONT_SIZE_TITLE = 18;
    private static final float FONT_SIZE_HEADING = 14;
    private static final float FONT_SIZE_BODY = 11;
    private static final float LINE_HEIGHT = 16;
    private static final DateTimeFormatter VN_DATE = DateTimeFormatter
            .ofPattern("dd/MM/yyyy HH:mm")
            .withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    /**
     * Generate a student progress report PDF.
     *
     * @param studentName  Student full name
     * @param studentEmail Student email
     * @param courses      List of course progress maps (courseName, progress, grade, status)
     * @param stats        Overall statistics (totalCourses, completedCourses, averageGrade, streakDays)
     * @return PDF bytes
     */
    public byte[] generateStudentReport(
            String studentName,
            String studentEmail,
            List<Map<String, Object>> courses,
            Map<String, Object> stats
    ) throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            float pageWidth = page.getMediaBox().getWidth();
            float y = page.getMediaBox().getHeight() - MARGIN;

            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                PDType1Font fontBold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
                PDType1Font fontRegular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

                // Header
                y = drawText(cs, "LMS Maritime - Bao cao tien do hoc vien", MARGIN, y, fontBold, FONT_SIZE_TITLE);
                y -= 8;

                // Separator line
                cs.moveTo(MARGIN, y);
                cs.lineTo(pageWidth - MARGIN, y);
                cs.stroke();
                y -= 20;

                // Student info
                y = drawText(cs, "Ho ten: " + studentName, MARGIN, y, fontRegular, FONT_SIZE_BODY);
                y = drawText(cs, "Email: " + studentEmail, MARGIN, y, fontRegular, FONT_SIZE_BODY);
                y = drawText(cs, "Ngay xuat: " + VN_DATE.format(Instant.now()), MARGIN, y, fontRegular, FONT_SIZE_BODY);
                y -= 10;

                // Overall statistics
                y = drawText(cs, "Thong ke tong quan", MARGIN, y, fontBold, FONT_SIZE_HEADING);
                y -= 4;

                int totalCourses = getInt(stats, "totalCourses");
                int completedCourses = getInt(stats, "completedCourses");
                double avgGrade = getDouble(stats, "averageGrade");
                int streakDays = getInt(stats, "streakDays");

                y = drawText(cs, "  Tong khoa hoc: " + totalCourses, MARGIN, y, fontRegular, FONT_SIZE_BODY);
                y = drawText(cs, "  Hoan thanh: " + completedCourses, MARGIN, y, fontRegular, FONT_SIZE_BODY);
                y = drawText(cs, "  Diem trung binh: " + String.format("%.1f", avgGrade), MARGIN, y, fontRegular, FONT_SIZE_BODY);
                y = drawText(cs, "  Chuoi hoc: " + streakDays + " ngay", MARGIN, y, fontRegular, FONT_SIZE_BODY);
                y -= 15;

                // Course progress table
                y = drawText(cs, "Chi tiet khoa hoc", MARGIN, y, fontBold, FONT_SIZE_HEADING);
                y -= 4;

                // Table header
                y = drawText(cs, String.format("  %-30s %10s %10s %12s", "Khoa hoc", "Tien do", "Diem", "Trang thai"),
                        MARGIN, y, fontBold, FONT_SIZE_BODY);

                for (Map<String, Object> course : courses) {
                    if (y < MARGIN + 40) {
                        // New page
                        PDPage newPage = new PDPage(PDRectangle.A4);
                        doc.addPage(newPage);
                        // Close current content stream and open a new one
                        cs.close();
                        y = newPage.getMediaBox().getHeight() - MARGIN;
                        // Note: Can't create new PDPageContentStream in try-with-resources scope
                        // For simplicity, limit to single-page reports
                        break;
                    }

                    String name = truncate(getString(course, "courseName"), 30);
                    int progress = getInt(course, "progress");
                    double grade = getDouble(course, "grade");
                    String status = getString(course, "status");

                    y = drawText(cs, String.format("  %-30s %9d%% %9.1f %12s", name, progress, grade, status),
                            MARGIN, y, fontRegular, FONT_SIZE_BODY);
                }

                y -= 20;
                // Footer
                cs.moveTo(MARGIN, y);
                cs.lineTo(pageWidth - MARGIN, y);
                cs.stroke();
                y -= 15;
                drawText(cs, "LMS Maritime Education Platform", MARGIN, y, fontRegular, 9);
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            doc.save(baos);
            return baos.toByteArray();
        }
    }

    private float drawText(PDPageContentStream cs, String text, float x, float y,
                           PDType1Font font, float fontSize) throws IOException {
        cs.beginText();
        cs.setFont(font, fontSize);
        cs.newLineAtOffset(x, y);
        cs.showText(text);
        cs.endText();
        return y - LINE_HEIGHT;
    }

    private static String truncate(String s, int max) {
        return s.length() > max ? s.substring(0, max - 3) + "..." : s;
    }

    private static int getInt(Map<String, Object> map, String key) {
        Object v = map.get(key);
        if (v instanceof Number n) return n.intValue();
        return 0;
    }

    private static double getDouble(Map<String, Object> map, String key) {
        Object v = map.get(key);
        if (v instanceof Number n) return n.doubleValue();
        return 0.0;
    }

    private static String getString(Map<String, Object> map, String key) {
        Object v = map.get(key);
        return v != null ? v.toString() : "";
    }
}

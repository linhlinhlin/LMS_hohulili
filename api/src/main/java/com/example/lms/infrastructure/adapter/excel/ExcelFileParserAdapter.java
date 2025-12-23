package com.example.lms.infrastructure.adapter.excel;

import com.example.lms.application.port.FileParserPort;
import com.example.lms.dto.ImportFailure;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.*;

@Component
public class ExcelFileParserAdapter implements FileParserPort {

    private static final int MAX_ROWS = 1000;
    private static final String EMAIL_HEADER = "Email";

    @Override
    public ParseResult parseStudentEmails(InputStream inputStream) {
        Map<String, Integer> validEmailsWithRows = new LinkedHashMap<>();
        List<ImportFailure> initialFailures = new ArrayList<>();

        try (Workbook workbook = new XSSFWorkbook(inputStream)) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null) {
                return new ParseResult(Collections.emptyMap(), initialFailures);
            }

            int lastRowNum = sheet.getLastRowNum();
            if (lastRowNum > MAX_ROWS) {
                throw new RuntimeException("File quá lớn. Tối đa cho phép " + MAX_ROWS + " dòng.");
            }

            Row firstRow = sheet.getRow(0);
            if (firstRow == null) {
                throw new RuntimeException("File không có dữ liệu.");
            }

            // Kiểm tra xem dòng đầu có phải là header "Email" hay không
            int emailColIndex = 0; // Mặc định cột A
            int startRow = 0; // Mặc định bắt đầu từ dòng 0
            
            // Tìm cột có header "Email" (nếu có)
            boolean hasHeader = false;
            for (Cell cell : firstRow) {
                if (cell != null && cell.getCellType() == CellType.STRING) {
                    String value = cell.getStringCellValue().trim();
                    if (EMAIL_HEADER.equalsIgnoreCase(value)) {
                        emailColIndex = cell.getColumnIndex();
                        hasHeader = true;
                        startRow = 1; // Bỏ qua dòng header
                        break;
                    }
                }
            }
            
            // Nếu không có header, kiểm tra xem dòng đầu có phải là email không
            if (!hasHeader) {
                Cell firstCell = firstRow.getCell(0);
                if (firstCell != null && firstCell.getCellType() == CellType.STRING) {
                    String firstValue = firstCell.getStringCellValue().trim();
                    // Nếu dòng đầu là email hợp lệ, đọc từ dòng 0
                    // Nếu không phải email (có thể là header khác), bỏ qua dòng đầu
                    if (!isValidEmail(firstValue)) {
                        startRow = 1;
                    }
                }
            }

            for (int i = startRow; i <= lastRowNum; i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                Cell cell = row.getCell(emailColIndex);
                String email = null;
                if (cell != null) {
                    if (cell.getCellType() == CellType.STRING) {
                        email = cell.getStringCellValue().trim();
                    } else if (cell.getCellType() == CellType.FORMULA) {
                        try {
                            email = cell.getStringCellValue().trim();
                        } catch (Exception ignored) {}
                    }
                }

                if (email == null || email.isEmpty()) {
                    continue;
                }

                if (isValidEmail(email)) {
                    validEmailsWithRows.putIfAbsent(email, i + 1);
                } else {
                    initialFailures.add(new ImportFailure(email, "Định dạng email không hợp lệ", i + 1));
                }
            }

        } catch (Exception e) {
            throw new RuntimeException("Lỗi khi đọc file Excel: " + e.getMessage());
        }

        return new ParseResult(validEmailsWithRows, initialFailures);
    }

    private boolean isValidEmail(String email) {
        return email != null && email.matches("^[A-Za-z0-9+_.-]+@(.+)$");
    }
}

package com.example.lms.service;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Service
public class ExcelProcessingService {
    
    private static final Pattern EMAIL_PATTERN = Pattern.compile(
        "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
    );
    
    /**
     * Extract email addresses from Excel file
     * Supports both .xlsx and .xls formats
     * Expects emails in first column or searches all columns for email-like values
     */
    public List<String> extractEmailsFromExcel(MultipartFile file) throws IOException {
        List<String> emails = new ArrayList<>();
        
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }
        
        String fileName = file.getOriginalFilename();
        if (fileName == null || (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls"))) {
            throw new IllegalArgumentException("File must be Excel format (.xlsx or .xls)");
        }
        
        try (Workbook workbook = createWorkbook(file)) {
            Sheet sheet = workbook.getSheetAt(0); // Use first sheet
            
            for (Row row : sheet) {
                if (row == null) continue;
                
                // Try first column first (most common case)
                String email = getCellValueAsString(row.getCell(0));
                if (isValidEmail(email)) {
                    emails.add(email.toLowerCase().trim());
                    continue;
                }
                
                // If first column doesn't have email, search all columns in this row
                for (Cell cell : row) {
                    email = getCellValueAsString(cell);
                    if (isValidEmail(email)) {
                        emails.add(email.toLowerCase().trim());
                        break; // Only take first email found in this row
                    }
                }
            }
        }
        
        // Remove duplicates while preserving order
        return emails.stream().distinct().toList();
    }
    
    /**
     * Create appropriate workbook based on file extension
     */
    private Workbook createWorkbook(MultipartFile file) throws IOException {
        String fileName = file.getOriginalFilename();
        if (fileName != null && fileName.endsWith(".xlsx")) {
            return new XSSFWorkbook(file.getInputStream());
        } else {
            return new HSSFWorkbook(file.getInputStream());
        }
    }
    
    /**
     * Get cell value as string regardless of cell type
     */
    private String getCellValueAsString(Cell cell) {
        if (cell == null) {
            return "";
        }
        
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue();
            case NUMERIC:
                // Handle numeric values that might be formatted as emails
                if (DateUtil.isCellDateFormatted(cell)) {
                    return "";
                }
                double numericValue = cell.getNumericCellValue();
                // If it's a whole number, return as integer string
                if (numericValue == (long) numericValue) {
                    return String.valueOf((long) numericValue);
                }
                return String.valueOf(numericValue);
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                // Evaluate formula and get result
                FormulaEvaluator evaluator = cell.getSheet().getWorkbook().getCreationHelper().createFormulaEvaluator();
                CellValue cellValue = evaluator.evaluate(cell);
                switch (cellValue.getCellType()) {
                    case STRING:
                        return cellValue.getStringValue();
                    case NUMERIC:
                        return String.valueOf(cellValue.getNumberValue());
                    case BOOLEAN:
                        return String.valueOf(cellValue.getBooleanValue());
                    default:
                        return "";
                }
            default:
                return "";
        }
    }
    
    /**
     * Validate email format
     */
    private boolean isValidEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            return false;
        }
        return EMAIL_PATTERN.matcher(email.trim()).matches();
    }
}
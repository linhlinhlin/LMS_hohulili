package com.example.lms.service;

import com.example.lms.entity.*;
import com.example.lms.repository.PackageRepository;
import com.example.lms.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.*;

@Service
@RequiredArgsConstructor
public class QuestionImportService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(QuestionImportService.class);

    private final QuestionRepository questionRepository;
    private final PackageRepository packageRepository;

    /**
     * Import questions from Excel file
     * Expected columns: Câu hỏi | Đáp án A | Đáp án B | Đáp án C | Đáp án D | Đáp án đúng
     */
    @Transactional
    public ImportResult importFromExcel(MultipartFile file, UUID packageId, 
                                        Question.Difficulty defaultDifficulty, 
                                        User currentUser) {
        ImportResult result = new ImportResult();
        
        try {
            com.example.lms.entity.Package pkg = packageRepository.findById(packageId)
                    .orElseThrow(() -> new RuntimeException("Package not found: " + packageId));

            try (InputStream is = file.getInputStream();
                 Workbook workbook = new XSSFWorkbook(is)) {
                
                Sheet sheet = workbook.getSheetAt(0);
                int rowCount = sheet.getPhysicalNumberOfRows();
                
                log.info("📊 Processing Excel file with {} rows", rowCount);
                
                // Skip header row (row 0)
                for (int i = 1; i < rowCount; i++) {
                    Row row = sheet.getRow(i);
                    if (row == null) continue;
                    
                    try {
                        Question question = parseRow(row, i, pkg, defaultDifficulty, currentUser);
                        if (question != null) {
                            questionRepository.save(question);
                            result.successCount++;
                            result.importedQuestions.add(question);
                            log.info("✅ Row {}: Imported question: {}", i + 1, 
                                    question.getContent().substring(0, Math.min(50, question.getContent().length())));
                        }
                    } catch (Exception e) {
                        result.failedCount++;
                        result.errors.add("Dòng " + (i + 1) + ": " + e.getMessage());
                        log.warn("❌ Row {}: Failed - {}", i + 1, e.getMessage());
                    }
                }
                
                // Package question count is calculated dynamically from questions list
                // No need to update manually
            }
            
        } catch (Exception e) {
            log.error("❌ Excel import failed: {}", e.getMessage(), e);
            result.errors.add("Lỗi đọc file: " + e.getMessage());
        }
        
        return result;
    }

    private Question parseRow(Row row, int rowIndex, com.example.lms.entity.Package pkg, 
                              Question.Difficulty defaultDifficulty, User currentUser) {
        // Get cell values
        String content = getCellValue(row, 0);      // Câu hỏi
        String optionA = getCellValue(row, 1);      // Đáp án A
        String optionB = getCellValue(row, 2);      // Đáp án B
        String optionC = getCellValue(row, 3);      // Đáp án C
        String optionD = getCellValue(row, 4);      // Đáp án D
        String correctAnswer = getCellValue(row, 5); // Đáp án đúng (A/B/C/D)
        
        // Validate required fields
        if (content == null || content.trim().isEmpty()) {
            return null; // Skip empty rows
        }
        
        if (optionA == null || optionA.trim().isEmpty()) {
            throw new RuntimeException("Thiếu đáp án A");
        }
        if (optionB == null || optionB.trim().isEmpty()) {
            throw new RuntimeException("Thiếu đáp án B");
        }
        
        // Normalize correct answer
        String normalizedCorrect = normalizeCorrectAnswer(correctAnswer);
        if (normalizedCorrect == null) {
            throw new RuntimeException("Đáp án đúng không hợp lệ: " + correctAnswer + " (phải là A, B, C hoặc D)");
        }
        
        // Create question
        Question question = Question.builder()
                .content(content.trim())
                .correctOption(normalizedCorrect)
                .difficulty(defaultDifficulty)
                .status(Question.Status.ACTIVE)
                .packageEntity(pkg)
                .createdBy(currentUser)
                .usageCount(0)
                .build();
        
        // Create options
        List<QuestionOption> options = new ArrayList<>();
        options.add(createOption(question, "A", optionA));
        options.add(createOption(question, "B", optionB));
        if (optionC != null && !optionC.trim().isEmpty()) {
            options.add(createOption(question, "C", optionC));
        }
        if (optionD != null && !optionD.trim().isEmpty()) {
            options.add(createOption(question, "D", optionD));
        }
        
        question.setOptions(options);
        return question;
    }

    private QuestionOption createOption(Question question, String key, String content) {
        return QuestionOption.builder()
                .question(question)
                .optionKey(key)
                .content(content.trim())
                .build();
    }

    private String getCellValue(Row row, int cellIndex) {
        Cell cell = row.getCell(cellIndex);
        if (cell == null) return null;
        
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> String.valueOf((int) cell.getNumericCellValue());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> {
                try {
                    yield cell.getStringCellValue();
                } catch (Exception e) {
                    yield String.valueOf(cell.getNumericCellValue());
                }
            }
            default -> null;
        };
    }

    private String normalizeCorrectAnswer(String answer) {
        if (answer == null) return null;
        String normalized = answer.trim().toUpperCase();
        
        // Handle various formats: "A", "a", "A.", "Đáp án A", etc.
        if (normalized.contains("A") && !normalized.contains("B") && !normalized.contains("C") && !normalized.contains("D")) {
            return "A";
        }
        if (normalized.contains("B") && !normalized.contains("A") && !normalized.contains("C") && !normalized.contains("D")) {
            return "B";
        }
        if (normalized.contains("C") && !normalized.contains("A") && !normalized.contains("B") && !normalized.contains("D")) {
            return "C";
        }
        if (normalized.contains("D") && !normalized.contains("A") && !normalized.contains("B") && !normalized.contains("C")) {
            return "D";
        }
        
        // Direct match
        if (normalized.equals("A") || normalized.equals("B") || normalized.equals("C") || normalized.equals("D")) {
            return normalized;
        }
        
        return null;
    }

    // Result class
    public static class ImportResult {
        public int successCount = 0;
        public int failedCount = 0;
        public List<String> errors = new ArrayList<>();
        public List<Question> importedQuestions = new ArrayList<>();
        
        public boolean hasErrors() {
            return !errors.isEmpty();
        }
    }
}

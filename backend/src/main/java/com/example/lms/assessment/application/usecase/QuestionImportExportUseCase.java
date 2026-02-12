package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.domain.model.Question;
import com.example.lms.assessment.domain.repository.QuestionRepository;
import com.example.lms.shared.domain.model.ContentBlock;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class QuestionImportExportUseCase {

    private final QuestionRepository questionRepository;

    /**
     * Export questions from a bank as CSV.
     * Format: questionType,difficulty,content,option1,option2,option3,option4,correctOption,tags
     */
    @Transactional(readOnly = true)
    public byte[] exportBankToCsv(UUID bankId) {
        List<Question> questions = questionRepository.findByBankId(bankId);

        StringBuilder sb = new StringBuilder();
        sb.append("questionType,difficulty,content,option1,option2,option3,option4,correctOption,tags\n");

        for (Question q : questions) {
            sb.append(csvEscape(q.getQuestionType() != null ? q.getQuestionType().name() : "SINGLE_CHOICE")).append(",");
            sb.append(csvEscape(q.getDifficulty() != null ? q.getDifficulty().name() : "MEDIUM")).append(",");

            // Extract text content from content blocks
            String content = extractTextContent(q.getContentBlocks());
            sb.append(csvEscape(content)).append(",");

            // Options
            List<Question.QuestionOption> options = q.getOptions() != null ? q.getOptions() : List.of();
            for (int i = 0; i < 4; i++) {
                if (i < options.size()) {
                    sb.append(csvEscape(extractTextContent(options.get(i).getContentBlocks())));
                }
                sb.append(",");
            }

            sb.append(q.getCorrectOption() != null ? q.getCorrectOption() : "").append(",");
            sb.append(csvEscape(q.getTags() != null ? q.getTags() : ""));
            sb.append("\n");
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    /**
     * Import questions from CSV into a bank.
     */
    @Transactional
    public ImportResult importFromCsv(UUID bankId, UUID createdBy, MultipartFile file) {
        int imported = 0;
        int failed = 0;
        List<String> errors = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {

            String header = reader.readLine(); // Skip header
            if (header == null) {
                return new ImportResult(0, 0, List.of("Empty file"));
            }

            String line;
            int lineNum = 1;
            while ((line = reader.readLine()) != null) {
                lineNum++;
                try {
                    String[] parts = parseCsvLine(line);
                    if (parts.length < 3) {
                        errors.add("Line " + lineNum + ": Not enough columns");
                        failed++;
                        continue;
                    }

                    String questionType = parts.length > 0 ? parts[0].trim() : "SINGLE_CHOICE";
                    String difficulty = parts.length > 1 ? parts[1].trim() : "MEDIUM";
                    String content = parts.length > 2 ? parts[2].trim() : "";

                    if (content.isBlank()) {
                        errors.add("Line " + lineNum + ": Empty content");
                        failed++;
                        continue;
                    }

                    // Build content blocks
                    Map<String, Object> blockData = new HashMap<>();
                    blockData.put("text", content);
                    ContentBlock textBlock = ContentBlock.create("TEXT", blockData);

                    // Parse options
                    List<Question.QuestionOption> options = new ArrayList<>();
                    String[] keys = {"A", "B", "C", "D"};
                    for (int i = 3; i < 7 && i < parts.length; i++) {
                        if (!parts[i].isBlank()) {
                            Map<String, Object> optData = new HashMap<>();
                            optData.put("text", parts[i].trim());
                            ContentBlock optBlock = ContentBlock.create("text", optData);
                            options.add(Question.QuestionOption.create(keys[i - 3], List.of(optBlock), i - 3));
                        }
                    }

                    // Correct option
                    String correctOption = null;
                    if (parts.length > 7 && !parts[7].isBlank()) {
                        correctOption = parts[7].trim();
                    }

                    // Tags
                    String tags = null;
                    if (parts.length > 8 && !parts[8].isBlank()) {
                        tags = parts[8].trim();
                    }

                    Question question = Question.builder()
                            .packageId(bankId)
                            .createdBy(createdBy)
                            .questionType(Question.QuestionType.valueOf(questionType))
                            .difficulty(Question.Difficulty.valueOf(difficulty))
                            .status(Question.Status.ACTIVE)
                            .contentBlocks(List.of(textBlock))
                            .options(options)
                            .correctOption(correctOption)
                            .tags(tags)
                            .build();

                    questionRepository.save(question);
                    imported++;
                } catch (IllegalArgumentException | IllegalStateException e) {
                    errors.add("Line " + lineNum + ": " + e.getMessage());
                    failed++;
                }
            }
        } catch (IOException e) {
            errors.add("Failed to read file: " + e.getMessage());
        }

        return new ImportResult(imported, failed, errors);
    }

    public record ImportResult(int imported, int failed, List<String> errors) {}

    private String extractTextContent(List<ContentBlock> blocks) {
        if (blocks == null || blocks.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (ContentBlock block : blocks) {
            if (block.getData() != null) {
                Object text = block.getData().get("text");
                if (text == null) text = block.getData().get("content");
                if (text != null) {
                    if (sb.length() > 0) sb.append(" ");
                    sb.append(text.toString());
                }
            }
        }
        return sb.toString();
    }

    private String csvEscape(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    private String[] parseCsvLine(String line) {
        List<String> result = new ArrayList<>();
        boolean inQuotes = false;
        StringBuilder current = new StringBuilder();

        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    current.append('"');
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c == ',' && !inQuotes) {
                result.add(current.toString());
                current = new StringBuilder();
            } else {
                current.append(c);
            }
        }
        result.add(current.toString());

        return result.toArray(new String[0]);
    }
}

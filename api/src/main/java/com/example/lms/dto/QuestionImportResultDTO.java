package com.example.lms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionImportResultDTO {
    private int successCount;
    private int failedCount;
    private int totalProcessed;
    private List<String> errors;
    private String message;
    
    public static QuestionImportResultDTO success(int successCount, int failedCount, List<String> errors) {
        return QuestionImportResultDTO.builder()
                .successCount(successCount)
                .failedCount(failedCount)
                .totalProcessed(successCount + failedCount)
                .errors(errors)
                .message(String.format("Import hoàn tất: %d thành công, %d thất bại", successCount, failedCount))
                .build();
    }
    
    public static QuestionImportResultDTO error(String message) {
        return QuestionImportResultDTO.builder()
                .successCount(0)
                .failedCount(0)
                .totalProcessed(0)
                .errors(List.of(message))
                .message(message)
                .build();
    }
}

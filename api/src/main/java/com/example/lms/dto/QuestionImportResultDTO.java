package com.example.lms.dto;

import java.util.List;

public class QuestionImportResultDTO {
    private int successCount;
    private int failedCount;
    private int totalProcessed;
    private List<String> errors;
    private String message;

    public QuestionImportResultDTO() {}

    public QuestionImportResultDTO(int successCount, int failedCount, int totalProcessed, List<String> errors, String message) {
        this.successCount = successCount;
        this.failedCount = failedCount;
        this.totalProcessed = totalProcessed;
        this.errors = errors;
        this.message = message;
    }

    // Manual Getters/Setters
    public int getSuccessCount() { return successCount; }
    public void setSuccessCount(int successCount) { this.successCount = successCount; }
    public int getFailedCount() { return failedCount; }
    public void setFailedCount(int failedCount) { this.failedCount = failedCount; }
    public int getTotalProcessed() { return totalProcessed; }
    public void setTotalProcessed(int totalProcessed) { this.totalProcessed = totalProcessed; }
    public List<String> getErrors() { return errors; }
    public void setErrors(List<String> errors) { this.errors = errors; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    // Manual Builder
    public static QuestionImportResultDTOBuilder builder() { return new QuestionImportResultDTOBuilder(); }
    public static class QuestionImportResultDTOBuilder {
        private QuestionImportResultDTO dto = new QuestionImportResultDTO();
        public QuestionImportResultDTOBuilder successCount(int s) { dto.setSuccessCount(s); return this; }
        public QuestionImportResultDTOBuilder failedCount(int f) { dto.setFailedCount(f); return this; }
        public QuestionImportResultDTOBuilder totalProcessed(int t) { dto.setTotalProcessed(t); return this; }
        public QuestionImportResultDTOBuilder errors(List<String> e) { dto.setErrors(e); return this; }
        public QuestionImportResultDTOBuilder message(String m) { dto.setMessage(m); return this; }
        public QuestionImportResultDTO build() { return dto; }
    }
    
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

package com.example.lms.dto.response;

import lombok.Data;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.ArrayList;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkEnrollmentResponse {
    
    private int totalProcessed;
    private int successCount;
    private int errorCount;
    
    @Builder.Default
    private List<String> successfulEnrollments = new ArrayList<>();
    
    @Builder.Default
    private List<EnrollmentError> errors = new ArrayList<>();
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EnrollmentError {
        private String email;
        private String errorMessage;
        private ErrorType errorType;
    }
    
    public enum ErrorType {
        EMAIL_NOT_FOUND("Email không tìm thấy trong hệ thống"),
        NOT_A_STUDENT("Tài khoản không phải là học viên"),
        ALREADY_ENROLLED("Học viên đã được gán vào khóa học"),
        INVALID_EMAIL_FORMAT("Định dạng email không hợp lệ"),
        SYSTEM_ERROR("Lỗi hệ thống");
        
        private final String message;
        
        ErrorType(String message) {
            this.message = message;
        }
        
        public String getMessage() {
            return message;
        }
    }
    
    public void addSuccess(String email) {
        successfulEnrollments.add(email);
        successCount++;
        totalProcessed++;
    }
    
    public void addError(String email, ErrorType errorType, String customMessage) {
        String message = customMessage != null ? customMessage : errorType.getMessage();
        errors.add(EnrollmentError.builder()
            .email(email)
            .errorType(errorType)
            .errorMessage(message)
            .build());
        errorCount++;
        totalProcessed++;
    }
    
    public void addError(String email, ErrorType errorType) {
        addError(email, errorType, null);
    }
}
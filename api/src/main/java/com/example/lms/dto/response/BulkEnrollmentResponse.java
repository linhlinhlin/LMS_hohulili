package com.example.lms.dto.response;

import java.util.List;
import java.util.ArrayList;

public class BulkEnrollmentResponse {
    
    private int totalProcessed;
    private int successCount;
    private int errorCount;
    
    private List<String> successfulEnrollments = new ArrayList<>();
    
    private List<EnrollmentError> errors = new ArrayList<>();
    
    public BulkEnrollmentResponse() {}

    public BulkEnrollmentResponse(int totalProcessed, int successCount, int errorCount, List<String> successfulEnrollments, List<EnrollmentError> errors) {
        this.totalProcessed = totalProcessed;
        this.successCount = successCount;
        this.errorCount = errorCount;
        this.successfulEnrollments = successfulEnrollments != null ? successfulEnrollments : new ArrayList<>();
        this.errors = errors != null ? errors : new ArrayList<>();
    }

    // Getters and Setters
    public int getTotalProcessed() { return totalProcessed; }
    public void setTotalProcessed(int totalProcessed) { this.totalProcessed = totalProcessed; }
    public int getSuccessCount() { return successCount; }
    public void setSuccessCount(int successCount) { this.successCount = successCount; }
    public int getErrorCount() { return errorCount; }
    public void setErrorCount(int errorCount) { this.errorCount = errorCount; }
    public List<String> getSuccessfulEnrollments() { return successfulEnrollments; }
    public void setSuccessfulEnrollments(List<String> successfulEnrollments) { this.successfulEnrollments = successfulEnrollments; }
    public List<EnrollmentError> getErrors() { return errors; }
    public void setErrors(List<EnrollmentError> errors) { this.errors = errors; }

    public static class EnrollmentError {
        private String email;
        private String errorMessage;
        private ErrorType errorType;

        public EnrollmentError() {}

        public EnrollmentError(String email, String errorMessage, ErrorType errorType) {
            this.email = email;
            this.errorMessage = errorMessage;
            this.errorType = errorType;
        }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getErrorMessage() { return errorMessage; }
        public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
        public ErrorType getErrorType() { return errorType; }
        public void setErrorType(ErrorType errorType) { this.errorType = errorType; }

        public static EnrollmentErrorBuilder builder() { return new EnrollmentErrorBuilder(); }
        public static class EnrollmentErrorBuilder {
            private EnrollmentError e = new EnrollmentError();
            public EnrollmentErrorBuilder email(String email) { e.setEmail(email); return this; }
            public EnrollmentErrorBuilder errorMessage(String errorMessage) { e.setErrorMessage(errorMessage); return this; }
            public EnrollmentErrorBuilder errorType(ErrorType errorType) { e.setErrorType(errorType); return this; }
            public EnrollmentError build() { return e; }
        }
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

    public static BulkEnrollmentResponseBuilder builder() { return new BulkEnrollmentResponseBuilder(); }
    public static class BulkEnrollmentResponseBuilder {
        private BulkEnrollmentResponse r = new BulkEnrollmentResponse();
        public BulkEnrollmentResponseBuilder totalProcessed(int t) { r.setTotalProcessed(t); return this; }
        public BulkEnrollmentResponseBuilder successCount(int s) { r.setSuccessCount(s); return this; }
        public BulkEnrollmentResponseBuilder errorCount(int e) { r.setErrorCount(e); return this; }
        public BulkEnrollmentResponseBuilder successfulEnrollments(List<String> s) { r.setSuccessfulEnrollments(s); return this; }
        public BulkEnrollmentResponseBuilder errors(List<EnrollmentError> e) { r.setErrors(e); return this; }
        public BulkEnrollmentResponse build() { return r; }
    }
}
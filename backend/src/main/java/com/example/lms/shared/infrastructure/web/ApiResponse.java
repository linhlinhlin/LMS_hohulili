package com.example.lms.shared.infrastructure.web;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;

/**
 * Standard API response wrapper.
 * Provides consistent response format across all endpoints.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private boolean success;
    private String message;
    private T data;
    private ErrorDetails error;
    private Instant timestamp;

    private ApiResponse() {
        this.timestamp = Instant.now();
    }

    /**
     * Create a successful response with data.
     */
    public static <T> ApiResponse<T> success(T data) {
        ApiResponse<T> response = new ApiResponse<>();
        response.success = true;
        response.data = data;
        return response;
    }

    /**
     * Create a successful response with data and message.
     */
    public static <T> ApiResponse<T> success(T data, String message) {
        ApiResponse<T> response = new ApiResponse<>();
        response.success = true;
        response.data = data;
        response.message = message;
        return response;
    }

    /**
     * Create a successful response with message only.
     */
    public static <T> ApiResponse<T> success(String message) {
        ApiResponse<T> response = new ApiResponse<>();
        response.success = true;
        response.message = message;
        return response;
    }

    /**
     * Create an error response.
     */
    public static <T> ApiResponse<T> error(String message) {
        ApiResponse<T> response = new ApiResponse<>();
        response.success = false;
        response.message = message;
        return response;
    }

    /**
     * Create an error response with error code.
     */
    public static <T> ApiResponse<T> error(String code, String message) {
        ApiResponse<T> response = new ApiResponse<>();
        response.success = false;
        response.message = message;
        response.error = new ErrorDetails(code, message);
        return response;
    }

    /**
     * Create an error response with full error details.
     */
    public static <T> ApiResponse<T> error(ErrorDetails errorDetails) {
        ApiResponse<T> response = new ApiResponse<>();
        response.success = false;
        response.message = errorDetails.getMessage();
        response.error = errorDetails;
        return response;
    }

    // Getters
    public boolean isSuccess() {
        return success;
    }

    public String getMessage() {
        return message;
    }

    public T getData() {
        return data;
    }

    public ErrorDetails getError() {
        return error;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    /**
     * Error details for API responses.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ErrorDetails {
        private String code;
        private String message;
        private java.util.Map<String, String> fieldErrors;

        public ErrorDetails() {}

        public ErrorDetails(String code, String message) {
            this.code = code;
            this.message = message;
        }

        public ErrorDetails(String code, String message, java.util.Map<String, String> fieldErrors) {
            this.code = code;
            this.message = message;
            this.fieldErrors = fieldErrors;
        }

        public String getCode() {
            return code;
        }

        public void setCode(String code) {
            this.code = code;
        }

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }

        public java.util.Map<String, String> getFieldErrors() {
            return fieldErrors;
        }

        public void setFieldErrors(java.util.Map<String, String> fieldErrors) {
            this.fieldErrors = fieldErrors;
        }
    }
}

package com.example.lms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiResponse<T> {
    private T data;
    private PaginationInfo pagination;
    private String message;
    
    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
                .data(data)
                .build();
    }
    
    public static <T> ApiResponse<T> success(T data, String message) {
        return ApiResponse.<T>builder()
                .data(data)
                .message(message)
                .build();
    }
    
    public static <T> ApiResponse<T> success(T data, PaginationInfo pagination) {
        return ApiResponse.<T>builder()
                .data(data)
                .pagination(pagination)
                .build();
    }
    
    public static <T> ApiResponse<org.springframework.data.domain.Page<T>> success(org.springframework.data.domain.Page<T> page) {
        PaginationInfo paginationInfo = PaginationInfo.builder()
                .page(page.getNumber() + 1) // Spring uses 0-based, we use 1-based
                .limit(page.getSize())
                .totalItems(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .build();
                
        return ApiResponse.<org.springframework.data.domain.Page<T>>builder()
                .data(page)
                .pagination(paginationInfo)
                .build();
    }
    
    public static <T> ApiResponse<T> error(String message) {
        return ApiResponse.<T>builder()
                .message(message)
                .build();
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaginationInfo {
        private int page;
        private int limit;
        private long totalItems;
        private int totalPages;
    }
}
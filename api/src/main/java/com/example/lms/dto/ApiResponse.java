package com.example.lms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

public class ApiResponse<T> {
    private T data;
    private PaginationInfo pagination;
    private String message;
    
    public ApiResponse(T data, PaginationInfo pagination, String message) {
        this.data = data;
        this.pagination = pagination;
        this.message = message;
    }
    
    public T getData() { return data; }
    public PaginationInfo getPagination() { return pagination; }
    public String getMessage() { return message; }
    
    public static <T> ApiResponseBuilder<T> builder() { return new ApiResponseBuilder<T>(); }
    public static class ApiResponseBuilder<T> {
        private T data;
        private PaginationInfo pagination;
        private String message;
        public ApiResponseBuilder<T> data(T data) { this.data = data; return this; }
        public ApiResponseBuilder<T> pagination(PaginationInfo pagination) { this.pagination = pagination; return this; }
        public ApiResponseBuilder<T> message(String message) { this.message = message; return this; }
        public ApiResponse<T> build() { return new ApiResponse<>(data, pagination, message); }
    }

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
    
    public static <T> ApiResponse<java.util.List<T>> successPage(org.springframework.data.domain.Page<T> page) {
        PaginationInfo paginationInfo = PaginationInfo.builder()
                .page(page.getNumber() + 1) // Spring uses 0-based, we use 1-based
                .limit(page.getSize())
                .totalItems(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .build();
                
        return ApiResponse.<java.util.List<T>>builder()
                .data(page.getContent())
                .pagination(paginationInfo)
                .build();
    }
    
    public static <T> ApiResponse<T> error(String message) {
        return ApiResponse.<T>builder()
                .message(message)
                .build();
    }
    
    public static class PaginationInfo {
        private int page;
        private int limit;
        private long totalItems;
        private int totalPages;
        
        public PaginationInfo(int page, int limit, long totalItems, int totalPages) {
            this.page = page;
            this.limit = limit;
            this.totalItems = totalItems;
            this.totalPages = totalPages;
        }

        public int getPage() { return page; }
        public int getLimit() { return limit; }
        public long getTotalItems() { return totalItems; }
        public int getTotalPages() { return totalPages; }

        public static PaginationInfoBuilder builder() { return new PaginationInfoBuilder(); }
        public static class PaginationInfoBuilder {
            private int page;
            private int limit;
            private long totalItems;
            private int totalPages;
            public PaginationInfoBuilder page(int page) { this.page = page; return this; }
            public PaginationInfoBuilder limit(int limit) { this.limit = limit; return this; }
            public PaginationInfoBuilder totalItems(long totalItems) { this.totalItems = totalItems; return this; }
            public PaginationInfoBuilder totalPages(int totalPages) { this.totalPages = totalPages; return this; }
            public PaginationInfo build() { return new PaginationInfo(page, limit, totalItems, totalPages); }
        }
    }
}

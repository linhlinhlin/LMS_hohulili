package com.example.lms.shared.domain;

import org.springframework.data.domain.Page;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Paginated response wrapper.
 * Provides consistent pagination format across all endpoints.
 */
public class PageResponse<T> {

    private List<T> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean first;
    private boolean last;
    private boolean hasNext;
    private boolean hasPrevious;

    private PageResponse() {}

    /**
     * Create PageResponse from Spring Data Page.
     */
    public static <T> PageResponse<T> from(Page<T> page) {
        PageResponse<T> response = new PageResponse<>();
        response.content = page.getContent();
        response.page = page.getNumber() + 1; // Convert to 1-based
        response.size = page.getSize();
        response.totalElements = page.getTotalElements();
        response.totalPages = page.getTotalPages();
        response.first = page.isFirst();
        response.last = page.isLast();
        response.hasNext = page.hasNext();
        response.hasPrevious = page.hasPrevious();
        return response;
    }

    /**
     * Create PageResponse from Spring Data Page with mapping function.
     */
    public static <T, R> PageResponse<R> from(Page<T> page, Function<T, R> mapper) {
        PageResponse<R> response = new PageResponse<>();
        response.content = page.getContent().stream()
                .map(mapper)
                .collect(Collectors.toList());
        response.page = page.getNumber() + 1;
        response.size = page.getSize();
        response.totalElements = page.getTotalElements();
        response.totalPages = page.getTotalPages();
        response.first = page.isFirst();
        response.last = page.isLast();
        response.hasNext = page.hasNext();
        response.hasPrevious = page.hasPrevious();
        return response;
    }

    /**
     * Create empty PageResponse.
     */
    public static <T> PageResponse<T> empty() {
        PageResponse<T> response = new PageResponse<>();
        response.content = List.of();
        response.page = 1;
        response.size = 0;
        response.totalElements = 0;
        response.totalPages = 0;
        response.first = true;
        response.last = true;
        response.hasNext = false;
        response.hasPrevious = false;
        return response;
    }

    // Getters
    public List<T> getContent() {
        return content;
    }

    public int getPage() {
        return page;
    }

    public int getSize() {
        return size;
    }

    public long getTotalElements() {
        return totalElements;
    }

    public int getTotalPages() {
        return totalPages;
    }

    public boolean isFirst() {
        return first;
    }

    public boolean isLast() {
        return last;
    }

    public boolean isHasNext() {
        return hasNext;
    }

    public boolean isHasPrevious() {
        return hasPrevious;
    }
}

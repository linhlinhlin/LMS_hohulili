package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.entity.Category;
import com.example.lms.service.CategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/categories")
@RequiredArgsConstructor
@Tag(name = "Category Management", description = "API quản lý danh mục")
public class CategoryController {
    private final CategoryService categoryService;

    @GetMapping
    @Operation(summary = "Lấy danh sách danh mục", description = "Lấy tất cả danh mục khóa học")
    public ResponseEntity<ApiResponse<List<Category>>> getAllCategories() {
        // Auto seed if empty for demo
        categoryService.seedCategories();
        return ResponseEntity.ok(ApiResponse.success(categoryService.getAllCategories()));
    }
}

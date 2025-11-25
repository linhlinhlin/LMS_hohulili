package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.service.QuizService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Development endpoints - REMOVE IN PRODUCTION!
 * These endpoints are for development and testing purposes only.
 */
@RestController
@RequestMapping("/api/v1/dev")
@RequiredArgsConstructor
@Tag(name = "Development", description = "Development endpoints - REMOVE IN PRODUCTION!")
public class DevController {

    private final QuizService quizService;

    @PostMapping("/cleanup-duplicate-quizzes")
    @Operation(summary = "Cleanup duplicate quizzes", description = "Clean up duplicate quizzes for the same lesson. DEV ONLY!")
    public ResponseEntity<ApiResponse<Map<String, Object>>> cleanupDuplicateQuizzes() {
        try {
            System.out.println("🧹 [DEV] Cleanup duplicate quizzes requested");
            Map<String, Object> result = quizService.cleanupDuplicateQuizzes();
            System.out.println("✅ [DEV] Cleanup completed: " + result);
            return ResponseEntity.ok(ApiResponse.success(result, "Cleanup completed"));
        } catch (RuntimeException e) {
            System.err.println("❌ [DEV] Cleanup duplicate quizzes failed: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/health")
    @Operation(summary = "Health check", description = "Simple health check endpoint")
    public ResponseEntity<ApiResponse<String>> healthCheck() {
        return ResponseEntity.ok(ApiResponse.success("OK", "Server is running"));
    }
}

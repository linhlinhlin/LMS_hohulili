package com.example.lms.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/health")
@Tag(name = "Health", description = "Health check endpoint")
public class HealthController {
    @Operation(summary = "Kiểm tra dịch vụ đang chạy")
    @GetMapping
    public Map<String, Object> check() {
        return Map.of("status", "UP", "timestamp", Instant.now().toString());
    }
}

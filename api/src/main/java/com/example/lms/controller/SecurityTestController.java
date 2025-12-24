package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/test")
@Tag(name = "Security Test", description = "API test bảo mật")
public class SecurityTestController {

    @GetMapping("/me")
    @Operation(summary = "Kiểm tra thông tin đăng nhập hiện tại")
    public ResponseEntity<ApiResponse<Map<String, Object>>> testMe(@AuthenticationPrincipal User currentUser) {
        System.out.println("=== SECURITY TEST HIT ===");
        if (currentUser == null) {
            System.out.println("No user found in @AuthenticationPrincipal");
            return ResponseEntity.ok(ApiResponse.success(Map.of(
                "authenticated", false,
                "msg", "No user found in @AuthenticationPrincipal"
            )));
        }
        
        var auth = SecurityContextHolder.getContext().getAuthentication();
        
        System.out.println("User: " + currentUser.getUsername());
        System.out.println("Role: " + currentUser.getRole());
        System.out.println("Authorities: " + auth.getAuthorities());
        
        return ResponseEntity.ok(ApiResponse.success(Map.of(
            "authenticated", true,
            "username", currentUser.getUsername(),
            "role", currentUser.getRole(),
            "authorities", auth.getAuthorities().toString()
        )));
    }
}

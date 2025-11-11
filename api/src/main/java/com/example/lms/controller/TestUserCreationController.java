package com.example.lms.controller;

import com.example.lms.entity.User;
import com.example.lms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * TEMPORARY CONTROLLER FOR TESTING
 * DELETE THIS IN PRODUCTION!
 */
@RestController
@RequestMapping("/api/v1/dev/test-user")
@RequiredArgsConstructor
public class TestUserCreationController {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    
    @PostMapping("/create-admin")
    public Map<String, Object> createTestAdmin(@RequestBody Map<String, String> request) {
        String username = request.getOrDefault("username", "testadmin");
        String password = request.getOrDefault("password", "Test@123");
        String email = request.getOrDefault("email", "testadmin@lms.com");
        
        // Delete existing user if any
        userRepository.findByUsername(username).ifPresent(userRepository::delete);
        
        // Create new user
        User user = User.builder()
                .username(username)
                .email(email)
                .password(passwordEncoder.encode(password))
                .fullName("Test Administrator")
                .role(User.Role.ADMIN)
                .enabled(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        
        User savedUser = userRepository.save(user);
        
        // Test password verification
        boolean passwordMatches = passwordEncoder.matches(password, savedUser.getPassword());
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("username", savedUser.getUsername());
        response.put("email", savedUser.getEmail());
        response.put("role", savedUser.getRole().name());
        response.put("password_used", password);
        response.put("password_hash", savedUser.getPassword());
        response.put("password_verified", passwordMatches);
        response.put("message", "User created successfully. You can now login with username: " + username + " and password: " + password);
        
        return response;
    }
    
    @PostMapping("/verify-password")
    public Map<String, Object> verifyPassword(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String password = request.get("password");
        
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        boolean matches = passwordEncoder.matches(password, user.getPassword());
        
        Map<String, Object> response = new HashMap<>();
        response.put("username", username);
        response.put("password_matches", matches);
        response.put("password_hash", user.getPassword());
        
        return response;
    }
}

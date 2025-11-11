package com.example.lms.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Temporary controller to generate password hashes
 * REMOVE THIS IN PRODUCTION!
 */
@RestController
@RequestMapping("/api/v1/dev/password-hash")
@RequiredArgsConstructor
public class PasswordHashController {
    
    private final PasswordEncoder passwordEncoder;
    
    @PostMapping("/generate")
    public Map<String, String> generateHash(@RequestBody Map<String, String> request) {
        String password = request.get("password");
        String hash = passwordEncoder.encode(password);
        
        Map<String, String> response = new HashMap<>();
        response.put("password", password);
        response.put("hash", hash);
        response.put("verified", String.valueOf(passwordEncoder.matches(password, hash)));
        
        return response;
    }
    
    @PostMapping("/verify")
    public Map<String, Object> verifyHash(@RequestBody Map<String, String> request) {
        String password = request.get("password");
        String hash = request.get("hash");
        
        boolean matches = passwordEncoder.matches(password, hash);
        
        Map<String, Object> response = new HashMap<>();
        response.put("password", password);
        response.put("hash", hash);
        response.put("matches", matches);
        
        return response;
    }
}

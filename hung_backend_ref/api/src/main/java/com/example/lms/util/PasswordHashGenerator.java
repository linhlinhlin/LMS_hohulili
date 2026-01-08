package com.example.lms.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Utility class to generate BCrypt password hashes
 * Run this class to generate password hashes for SQL scripts
 */
public class PasswordHashGenerator {
    
    public static void main(String[] args) {
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
        
        // Generate hashes for common passwords
        String[] passwords = {"admin123", "password123", "123456"};
        
        System.out.println("=".repeat(80));
        System.out.println("BCrypt Password Hash Generator");
        System.out.println("=".repeat(80));
        
        for (String password : passwords) {
            String hash = passwordEncoder.encode(password);
            System.out.println("\nPassword: " + password);
            System.out.println("Hash:     " + hash);
            System.out.println("Verify:   " + passwordEncoder.matches(password, hash));
        }
        
        System.out.println("\n" + "=".repeat(80));
        System.out.println("Copy the hash above and use it in your SQL INSERT statements");
        System.out.println("=".repeat(80));
    }
}

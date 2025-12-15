package com.example.lms.entity.converter;

import com.example.lms.entity.User.Role;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Converter to handle case-insensitive User Role values from database.
 */
@Converter(autoApply = false)
public class UserRoleConverter implements AttributeConverter<Role, String> {

    @Override
    public String convertToDatabaseColumn(Role attribute) {
        if (attribute == null) {
            return null;
        }
        return attribute.name();
    }

    @Override
    public Role convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) {
            return Role.STUDENT; // default value
        }
        
        // Normalize: convert to uppercase
        String normalized = dbData.toUpperCase().trim();
        
        // Handle "ROLE_" prefix if present (common Spring Security convention)
        if (normalized.startsWith("ROLE_")) {
            normalized = normalized.substring(5);
        }
        
        // Try exact match
        try {
            return Role.valueOf(normalized);
        } catch (IllegalArgumentException e) {
            System.err.println("WARNING: Unknown User Role value in database: '" + dbData + "', defaulting to STUDENT");
            return Role.STUDENT;
        }
    }
}

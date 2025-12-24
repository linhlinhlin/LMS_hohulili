package com.example.lms.entity.converter;

import com.example.lms.entity.Assignment.AssignmentStatus;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Converter to handle case-insensitive AssignmentStatus values from database.
 * This allows both 'DRAFT' and 'draft' to map to AssignmentStatus.DRAFT
 */
@Converter(autoApply = false)
public class AssignmentStatusConverter implements AttributeConverter<AssignmentStatus, String> {

    @Override
    public String convertToDatabaseColumn(AssignmentStatus attribute) {
        if (attribute == null) {
            return null;
        }
        return attribute.name();
    }

    @Override
    public AssignmentStatus convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) {
            return AssignmentStatus.PUBLISHED; // default value
        }
        
        // Normalize: convert to uppercase
        String normalized = dbData.toUpperCase().trim();
        
        // Try exact match first
        try {
            return AssignmentStatus.valueOf(normalized);
        } catch (IllegalArgumentException e) {
            // Try case-insensitive match with original value
            for (AssignmentStatus status : AssignmentStatus.values()) {
                if (status.name().equalsIgnoreCase(dbData)) {
                    return status;
                }
            }
            
            // Log warning and return default
            System.err.println("WARNING: Unknown AssignmentStatus value in database: '" + dbData + "', defaulting to PUBLISHED");
            return AssignmentStatus.PUBLISHED;
        }
    }
}

package com.example.lms.entity.converter;

import com.example.lms.entity.Assignment.AssignmentType;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Converter to handle case-insensitive AssignmentType values from database.
 * This allows both 'FILE_SUBMISSION' and 'file_submission' to map to AssignmentType.FILE_SUBMISSION
 */
@Converter(autoApply = false)
public class AssignmentTypeConverter implements AttributeConverter<AssignmentType, String> {

    @Override
    public String convertToDatabaseColumn(AssignmentType attribute) {
        if (attribute == null) {
            return null;
        }
        return attribute.name();
    }

    @Override
    public AssignmentType convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) {
            return AssignmentType.FILE_SUBMISSION; // default value
        }
        
        // Normalize: convert to uppercase and replace any variations
        String normalized = dbData.toUpperCase().trim();
        
        // Try exact match first
        try {
            return AssignmentType.valueOf(normalized);
        } catch (IllegalArgumentException e) {
            // Try case-insensitive match with original value
            for (AssignmentType type : AssignmentType.values()) {
                if (type.name().equalsIgnoreCase(dbData)) {
                    return type;
                }
            }
            
            // Log warning and return default
            System.err.println("WARNING: Unknown AssignmentType value in database: '" + dbData + "', defaulting to FILE_SUBMISSION");
            return AssignmentType.FILE_SUBMISSION;
        }
    }
}

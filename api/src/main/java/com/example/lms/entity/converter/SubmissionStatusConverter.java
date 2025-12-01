package com.example.lms.entity.converter;

import com.example.lms.entity.AssignmentSubmission.Status;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Converter to handle case-insensitive Submission Status values from database.
 */
@Converter(autoApply = false)
public class SubmissionStatusConverter implements AttributeConverter<Status, String> {

    @Override
    public String convertToDatabaseColumn(Status attribute) {
        if (attribute == null) {
            return null;
        }
        return attribute.name();
    }

    @Override
    public Status convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) {
            return Status.SUBMITTED; // default value
        }
        
        // Normalize: convert to uppercase
        String normalized = dbData.toUpperCase().trim();
        
        // Try exact match first
        try {
            return Status.valueOf(normalized);
        } catch (IllegalArgumentException e) {
            // Try case-insensitive match
            for (Status status : Status.values()) {
                if (status.name().equalsIgnoreCase(dbData)) {
                    return status;
                }
            }
            
            System.err.println("WARNING: Unknown Submission Status value in database: '" + dbData + "', defaulting to SUBMITTED");
            return Status.SUBMITTED;
        }
    }
}

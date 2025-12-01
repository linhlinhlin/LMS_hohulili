package com.example.lms.entity.converter;

import com.example.lms.entity.Course.CourseStatus;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Converter to handle case-insensitive CourseStatus values from database.
 */
@Converter(autoApply = false)
public class CourseStatusConverter implements AttributeConverter<CourseStatus, String> {

    @Override
    public String convertToDatabaseColumn(CourseStatus attribute) {
        if (attribute == null) {
            return null;
        }
        return attribute.name();
    }

    @Override
    public CourseStatus convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) {
            return CourseStatus.DRAFT;
        }
        
        String normalized = dbData.toUpperCase().trim();
        
        try {
            return CourseStatus.valueOf(normalized);
        } catch (IllegalArgumentException e) {
            for (CourseStatus status : CourseStatus.values()) {
                if (status.name().equalsIgnoreCase(dbData)) {
                    return status;
                }
            }
            System.err.println("WARNING: Unknown CourseStatus value: '" + dbData + "', defaulting to DRAFT");
            return CourseStatus.DRAFT;
        }
    }
}

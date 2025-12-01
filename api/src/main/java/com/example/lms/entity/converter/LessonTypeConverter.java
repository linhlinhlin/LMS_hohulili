package com.example.lms.entity.converter;

import com.example.lms.entity.Lesson.LessonType;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Converter to handle case-insensitive LessonType values from database.
 */
@Converter(autoApply = false)
public class LessonTypeConverter implements AttributeConverter<LessonType, String> {

    @Override
    public String convertToDatabaseColumn(LessonType attribute) {
        if (attribute == null) {
            return null;
        }
        return attribute.name();
    }

    @Override
    public LessonType convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) {
            return LessonType.LECTURE;
        }
        
        String normalized = dbData.toUpperCase().trim();
        
        try {
            return LessonType.valueOf(normalized);
        } catch (IllegalArgumentException e) {
            for (LessonType type : LessonType.values()) {
                if (type.name().equalsIgnoreCase(dbData)) {
                    return type;
                }
            }
            System.err.println("WARNING: Unknown LessonType value: '" + dbData + "', defaulting to LECTURE");
            return LessonType.LECTURE;
        }
    }
}

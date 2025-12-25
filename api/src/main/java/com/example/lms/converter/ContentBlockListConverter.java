package com.example.lms.converter;

import com.example.lms.domain.ContentBlock;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Collections;
import java.util.List;

@Converter
public class ContentBlockListConverter implements AttributeConverter<List<ContentBlock>, String> {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(List<ContentBlock> attribute) {
        if (attribute == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(attribute);
        } catch (JsonProcessingException e) {
            // Log error or rethrow
            throw new RuntimeException("Error converting ContentBlock list to JSON", e);
        }
    }

    @Override
    public List<ContentBlock> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(dbData, new TypeReference<List<ContentBlock>>() {});
        } catch (JsonProcessingException e) {
            // Fallback for legacy plain text data
            // If data is not valid JSON, treat it as raw HTML/Text content
            return ContentBlock.fromText(dbData);
        }
    }
}

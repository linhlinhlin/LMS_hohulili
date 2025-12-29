package com.example.lms.dto.request;

import com.example.lms.entity.Section;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SectionRequest {
    private UUID lessonId; // Required for Create
    private String title;
    private String type; // VIDEO, TEXT, QUIZ, FILE
    private Boolean isRequired;
    
    // Content fields
    private String content; // HTML or Text
    
    // Video fields
    private String videoUrl;
    private String videoType; // YOUTUBE, CLOUDFLARE
    private String cfObjectKey;
    
    // File fields
    // File is sent as separately MultipartFile, but we might want to store metadata here if needed
    
    // Quiz Data (for Unified Save)
    private QuizEmbeddedRequest quizData;
}

package com.example.lms.dto.response;

import com.example.lms.entity.Section;
import com.example.lms.entity.Section.SectionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SectionResponse {
    private UUID id;
    private String title;
    private SectionType type;
    private String content;
    private String videoUrl;
    private String fileUrl;
    private Boolean isRequired;
    private Integer duration;
    private Integer orderIndex;
    private UUID lessonId;
    private Instant createdAt;
    private Instant updatedAt;

    private QuizEmbeddedResponse quizData;

    public static SectionResponse fromEntity(Section section) {
        SectionResponseBuilder builder = SectionResponse.builder()
                .id(section.getId())
                .title(section.getTitle())
                .type(section.getType())
                .content(section.getContent())
                .videoUrl(section.getVideoUrl())
                .fileUrl(section.getFileUrl())
                .isRequired(section.getIsRequired())
                .duration(section.getDuration())
                .orderIndex(section.getOrderIndex())
                .lessonId(section.getLesson() != null ? section.getLesson().getId() : null)
                .createdAt(section.getCreatedAt())
                .updatedAt(section.getUpdatedAt());

        // Hydrate Quiz Data if type is QUIZ and quiz exists
        if (section.getType() == SectionType.QUIZ && section.getQuizzes() != null && !section.getQuizzes().isEmpty()) {
             // Use the most recent quiz or the first one found
             com.example.lms.entity.Quiz quiz = section.getQuizzes().get(0);
             
             java.util.List<java.util.Map<String, Object>> questions = new java.util.ArrayList<>();
             if (quiz.getQuizQuestions() != null) {
                 for (com.example.lms.entity.QuizQuestion qq : quiz.getQuizQuestions()) {
                     if (qq.getQuestion() != null) {
                        java.util.Map<String, Object> qMap = new java.util.HashMap<>();
                        qMap.put("id", qq.getQuestion().getId());
                        qMap.put("content", qq.getQuestion().getContent());
                        // qMap.put("type", qq.getQuestion().getType()); // Field does not exist
                        questions.add(qMap);
                     }
                 }
             }

             builder.quizData(QuizEmbeddedResponse.builder()
                 .id(quiz.getId())
                 .timeLimitMinutes(quiz.getTimeLimitMinutes())
                 .maxAttempts(quiz.getMaxAttempts())
                 .passingScore(quiz.getPassingScore())
                 .shuffleQuestions(quiz.getShuffleQuestions())
                 .shuffleOptions(quiz.getShuffleOptions())
                 .showResultsImmediately(quiz.getShowResultsImmediately())
                 .questions(questions)
                 .build());
        }
        
        return builder.build();
    }
    
    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class QuizEmbeddedResponse {
        private UUID id;
        private Integer timeLimitMinutes;
        private Integer maxAttempts;
        private Integer passingScore;
        private Boolean shuffleQuestions;
        private Boolean shuffleOptions;
        private Boolean showResultsImmediately;
        private java.util.List<java.util.Map<String, Object>> questions; // Simple lightweight representation
    }
}

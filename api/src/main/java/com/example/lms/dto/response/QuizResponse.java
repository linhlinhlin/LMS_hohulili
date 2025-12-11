package com.example.lms.dto.response;

import com.example.lms.entity.Quiz;
import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO for Quiz
 */
public class QuizResponse {

    private UUID id;
    private String title;
    private String description;
    private Quiz.QuizType type;
    
    // Context references
    private UUID lessonId;
    private String lessonTitle;
    private UUID courseId;
    private String courseTitle;
    
    // Configuration
    private Integer timeLimitMinutes;
    private Integer maxAttempts;
    private Integer passingScore;
    private Boolean shuffleQuestions;
    private Boolean shuffleOptions;
    private Boolean showResultsImmediately;
    private Boolean showCorrectAnswers;
    private Instant startDate;
    private Instant endDate;
    
    // Metadata
    private Integer questionCount;
    private UUID createdBy;
    private String createdByName;
    private Instant publishedAt;
    private Instant createdAt;
    private Instant updatedAt;

    public QuizResponse() {}

    public QuizResponse(UUID id, String title, String description, Quiz.QuizType type, UUID lessonId, String lessonTitle, UUID courseId, String courseTitle, Integer timeLimitMinutes, Integer maxAttempts, Integer passingScore, Boolean shuffleQuestions, Boolean shuffleOptions, Boolean showResultsImmediately, Boolean showCorrectAnswers, Instant startDate, Instant endDate, Integer questionCount, UUID createdBy, String createdByName, Instant publishedAt, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.type = type;
        this.lessonId = lessonId;
        this.lessonTitle = lessonTitle;
        this.courseId = courseId;
        this.courseTitle = courseTitle;
        this.timeLimitMinutes = timeLimitMinutes;
        this.maxAttempts = maxAttempts;
        this.passingScore = passingScore;
        this.shuffleQuestions = shuffleQuestions;
        this.shuffleOptions = shuffleOptions;
        this.showResultsImmediately = showResultsImmediately;
        this.showCorrectAnswers = showCorrectAnswers;
        this.startDate = startDate;
        this.endDate = endDate;
        this.questionCount = questionCount;
        this.createdBy = createdBy;
        this.createdByName = createdByName;
        this.publishedAt = publishedAt;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Quiz.QuizType getType() { return type; }
    public void setType(Quiz.QuizType type) { this.type = type; }
    public UUID getLessonId() { return lessonId; }
    public void setLessonId(UUID lessonId) { this.lessonId = lessonId; }
    public String getLessonTitle() { return lessonTitle; }
    public void setLessonTitle(String lessonTitle) { this.lessonTitle = lessonTitle; }
    public UUID getCourseId() { return courseId; }
    public void setCourseId(UUID courseId) { this.courseId = courseId; }
    public String getCourseTitle() { return courseTitle; }
    public void setCourseTitle(String courseTitle) { this.courseTitle = courseTitle; }
    public Integer getTimeLimitMinutes() { return timeLimitMinutes; }
    public void setTimeLimitMinutes(Integer timeLimitMinutes) { this.timeLimitMinutes = timeLimitMinutes; }
    public Integer getMaxAttempts() { return maxAttempts; }
    public void setMaxAttempts(Integer maxAttempts) { this.maxAttempts = maxAttempts; }
    public Integer getPassingScore() { return passingScore; }
    public void setPassingScore(Integer passingScore) { this.passingScore = passingScore; }
    public Boolean getShuffleQuestions() { return shuffleQuestions; }
    public void setShuffleQuestions(Boolean shuffleQuestions) { this.shuffleQuestions = shuffleQuestions; }
    public Boolean getShuffleOptions() { return shuffleOptions; }
    public void setShuffleOptions(Boolean shuffleOptions) { this.shuffleOptions = shuffleOptions; }
    public Boolean getShowResultsImmediately() { return showResultsImmediately; }
    public void setShowResultsImmediately(Boolean showResultsImmediately) { this.showResultsImmediately = showResultsImmediately; }
    public Boolean getShowCorrectAnswers() { return showCorrectAnswers; }
    public void setShowCorrectAnswers(Boolean showCorrectAnswers) { this.showCorrectAnswers = showCorrectAnswers; }
    public Instant getStartDate() { return startDate; }
    public void setStartDate(Instant startDate) { this.startDate = startDate; }
    public Instant getEndDate() { return endDate; }
    public void setEndDate(Instant endDate) { this.endDate = endDate; }
    public Integer getQuestionCount() { return questionCount; }
    public void setQuestionCount(Integer questionCount) { this.questionCount = questionCount; }
    public UUID getCreatedBy() { return createdBy; }
    public void setCreatedBy(UUID createdBy) { this.createdBy = createdBy; }
    public String getCreatedByName() { return createdByName; }
    public void setCreatedByName(String createdByName) { this.createdByName = createdByName; }
    public Instant getPublishedAt() { return publishedAt; }
    public void setPublishedAt(Instant publishedAt) { this.publishedAt = publishedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    // Builder
    public static QuizResponseBuilder builder() { return new QuizResponseBuilder(); }
    public static class QuizResponseBuilder {
        private QuizResponse r = new QuizResponse();
        public QuizResponseBuilder id(UUID id) { r.setId(id); return this; }
        public QuizResponseBuilder title(String t) { r.setTitle(t); return this; }
        public QuizResponseBuilder description(String d) { r.setDescription(d); return this; }
        public QuizResponseBuilder type(Quiz.QuizType t) { r.setType(t); return this; }
        public QuizResponseBuilder lessonId(UUID id) { r.setLessonId(id); return this; }
        public QuizResponseBuilder lessonTitle(String t) { r.setLessonTitle(t); return this; }
        public QuizResponseBuilder courseId(UUID id) { r.setCourseId(id); return this; }
        public QuizResponseBuilder courseTitle(String t) { r.setCourseTitle(t); return this; }
        public QuizResponseBuilder timeLimitMinutes(Integer t) { r.setTimeLimitMinutes(t); return this; }
        public QuizResponseBuilder maxAttempts(Integer m) { r.setMaxAttempts(m); return this; }
        public QuizResponseBuilder passingScore(Integer p) { r.setPassingScore(p); return this; }
        public QuizResponseBuilder shuffleQuestions(Boolean s) { r.setShuffleQuestions(s); return this; }
        public QuizResponseBuilder shuffleOptions(Boolean s) { r.setShuffleOptions(s); return this; }
        public QuizResponseBuilder showResultsImmediately(Boolean s) { r.setShowResultsImmediately(s); return this; }
        public QuizResponseBuilder showCorrectAnswers(Boolean s) { r.setShowCorrectAnswers(s); return this; }
        public QuizResponseBuilder startDate(Instant s) { r.setStartDate(s); return this; }
        public QuizResponseBuilder endDate(Instant e) { r.setEndDate(e); return this; }
        public QuizResponseBuilder questionCount(Integer c) { r.setQuestionCount(c); return this; }
        public QuizResponseBuilder createdBy(UUID c) { r.setCreatedBy(c); return this; }
        public QuizResponseBuilder createdByName(String n) { r.setCreatedByName(n); return this; }
        public QuizResponseBuilder publishedAt(Instant p) { r.setPublishedAt(p); return this; }
        public QuizResponseBuilder createdAt(Instant c) { r.setCreatedAt(c); return this; }
        public QuizResponseBuilder updatedAt(Instant u) { r.setUpdatedAt(u); return this; }
        public QuizResponse build() { return r; }
    }
}

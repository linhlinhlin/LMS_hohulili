package com.example.lms.dto;

import java.time.Instant;
import java.util.UUID;

public class QuizDTO {
    private UUID id;
    private UUID lessonId;
    private String lessonTitle;
    private UUID sectionId;
    private String sectionTitle;
    private UUID courseId;
    private String courseTitle;
    private String courseCode;
    
    private Integer timeLimitMinutes;
    private Integer maxAttempts;
    private Integer passingScore;
    private Boolean shuffleQuestions;
    private Boolean shuffleOptions;
    private Boolean showResultsImmediately;
    private Boolean showCorrectAnswers;
    private Instant startDate;
    private Instant endDate;
    
    // Selection criteria
    private String questionIds;
    private Integer randomCount;
    private String randomDifficulties;
    private String randomTags;
    
    private Instant createdAt;
    private Instant updatedAt;
    
    // Summary info
    private Integer totalAttempts;
    private Double averageScore; // Added missing field

    public QuizDTO() {}

    public QuizDTO(UUID id, UUID lessonId, String lessonTitle, UUID sectionId, String sectionTitle, UUID courseId, String courseTitle, String courseCode, Integer timeLimitMinutes, Integer maxAttempts, Integer passingScore, Boolean shuffleQuestions, Boolean shuffleOptions, Boolean showResultsImmediately, Boolean showCorrectAnswers, Instant startDate, Instant endDate, String questionIds, Integer randomCount, String randomDifficulties, String randomTags, Instant createdAt, Instant updatedAt, Integer totalAttempts, Double averageScore) {
        this.id = id;
        this.lessonId = lessonId;
        this.lessonTitle = lessonTitle;
        this.sectionId = sectionId;
        this.sectionTitle = sectionTitle;
        this.courseId = courseId;
        this.courseTitle = courseTitle;
        this.courseCode = courseCode;
        this.timeLimitMinutes = timeLimitMinutes;
        this.maxAttempts = maxAttempts;
        this.passingScore = passingScore;
        this.shuffleQuestions = shuffleQuestions;
        this.shuffleOptions = shuffleOptions;
        this.showResultsImmediately = showResultsImmediately;
        this.showCorrectAnswers = showCorrectAnswers;
        this.startDate = startDate;
        this.endDate = endDate;
        this.questionIds = questionIds;
        this.randomCount = randomCount;
        this.randomDifficulties = randomDifficulties;
        this.randomTags = randomTags;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.totalAttempts = totalAttempts;
        this.averageScore = averageScore;
    }

    // Manual Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getLessonId() { return lessonId; }
    public void setLessonId(UUID lessonId) { this.lessonId = lessonId; }
    public String getLessonTitle() { return lessonTitle; }
    public void setLessonTitle(String lessonTitle) { this.lessonTitle = lessonTitle; }
    public UUID getSectionId() { return sectionId; }
    public void setSectionId(UUID sectionId) { this.sectionId = sectionId; }
    public String getSectionTitle() { return sectionTitle; }
    public void setSectionTitle(String sectionTitle) { this.sectionTitle = sectionTitle; }
    public UUID getCourseId() { return courseId; }
    public void setCourseId(UUID courseId) { this.courseId = courseId; }
    public String getCourseTitle() { return courseTitle; }
    public void setCourseTitle(String courseTitle) { this.courseTitle = courseTitle; }
    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }
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
    public String getQuestionIds() { return questionIds; }
    public void setQuestionIds(String questionIds) { this.questionIds = questionIds; }
    public Integer getRandomCount() { return randomCount; }
    public void setRandomCount(Integer randomCount) { this.randomCount = randomCount; }
    public String getRandomDifficulties() { return randomDifficulties; }
    public void setRandomDifficulties(String randomDifficulties) { this.randomDifficulties = randomDifficulties; }
    public String getRandomTags() { return randomTags; }
    public void setRandomTags(String randomTags) { this.randomTags = randomTags; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public Integer getTotalAttempts() { return totalAttempts; }
    public void setTotalAttempts(Integer totalAttempts) { this.totalAttempts = totalAttempts; }
    public Double getAverageScore() { return averageScore; }
    public void setAverageScore(Double averageScore) { this.averageScore = averageScore; }

    // Manual Builder
    public static QuizDTOBuilder builder() { return new QuizDTOBuilder(); }
    public static class QuizDTOBuilder {
        private QuizDTO dto = new QuizDTO();
        public QuizDTOBuilder id(UUID id) { dto.setId(id); return this; }
        public QuizDTOBuilder lessonId(UUID id) { dto.setLessonId(id); return this; }
        public QuizDTOBuilder lessonTitle(String t) { dto.setLessonTitle(t); return this; }
        public QuizDTOBuilder sectionId(UUID id) { dto.setSectionId(id); return this; }
        public QuizDTOBuilder sectionTitle(String t) { dto.setSectionTitle(t); return this; }
        public QuizDTOBuilder courseId(UUID id) { dto.setCourseId(id); return this; }
        public QuizDTOBuilder courseTitle(String t) { dto.setCourseTitle(t); return this; }
        public QuizDTOBuilder courseCode(String c) { dto.setCourseCode(c); return this; }
        public QuizDTOBuilder timeLimitMinutes(Integer t) { dto.setTimeLimitMinutes(t); return this; }
        public QuizDTOBuilder maxAttempts(Integer m) { dto.setMaxAttempts(m); return this; }
        public QuizDTOBuilder passingScore(Integer p) { dto.setPassingScore(p); return this; }
        public QuizDTOBuilder shuffleQuestions(Boolean s) { dto.setShuffleQuestions(s); return this; }
        public QuizDTOBuilder shuffleOptions(Boolean s) { dto.setShuffleOptions(s); return this; }
        public QuizDTOBuilder showResultsImmediately(Boolean s) { dto.setShowResultsImmediately(s); return this; }
        public QuizDTOBuilder showCorrectAnswers(Boolean s) { dto.setShowCorrectAnswers(s); return this; }
        public QuizDTOBuilder startDate(Instant s) { dto.setStartDate(s); return this; }
        public QuizDTOBuilder endDate(Instant e) { dto.setEndDate(e); return this; }
        public QuizDTOBuilder questionIds(String q) { dto.setQuestionIds(q); return this; }
        public QuizDTOBuilder randomCount(Integer r) { dto.setRandomCount(r); return this; }
        public QuizDTOBuilder randomDifficulties(String r) { dto.setRandomDifficulties(r); return this; }
        public QuizDTOBuilder randomTags(String r) { dto.setRandomTags(r); return this; }
        public QuizDTOBuilder createdAt(Instant c) { dto.setCreatedAt(c); return this; }
        public QuizDTOBuilder updatedAt(Instant u) { dto.setUpdatedAt(u); return this; }
        public QuizDTOBuilder totalAttempts(Integer t) { dto.setTotalAttempts(t); return this; }
        public QuizDTOBuilder averageScore(Double a) { dto.setAverageScore(a); return this; }
        public QuizDTO build() { return dto; }
    }
}
